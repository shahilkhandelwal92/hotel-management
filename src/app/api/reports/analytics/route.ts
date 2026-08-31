import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const reportAccess = await getReportAccess(req, searchParams.get("hotelId"));
    if (!reportAccess) return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    const hotelId = reportAccess.hotelId;
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });

    const [year, month] = (searchParams.get("month") ?? new Date().toISOString().slice(0, 7)).split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    // ── Parallel data fetch ──────────────────────────────────────
    const [
        rooms,
        allReservations,
        invoices,
        payments,
        guests,
        guestProfiles,
        openRequests,
        pendingHousekeeping,
    ] = await Promise.all([
        prisma.room.findMany({ where: { hotelId }, select: { id: true, status: true, type: true } }),

        prisma.reservation.findMany({
            where: { hotelId },
            select: {
                id: true, status: true, checkIn: true, checkOut: true,
                totalAmount: true, baseAmount: true, bookingType: true,
                guestState: true, guestProfileId: true,
                actualCheckIn: true, actualCheckOut: true,
                createdAt: true,
            },
        }),

        prisma.invoice.findMany({
            where: { hotelId, deletedAt: null },
            select: { grandTotal: true, cgst: true, sgst: true, igst: true, createdAt: true, items: { select: { itemType: true, lineTotal: true } } },
        }),

        prisma.payment.findMany({
            where: { hotelId, invoice: { hotelId } },
            select: { amount: true, paymentMode: true, paidAt: true },
        }),

        prisma.guestCRMProfile.findMany({
            where: { hotelId },
            select: { id: true, totalStays: true },
        }),

        prisma.guestCRMProfile.count({ where: { hotelId } }),

        prisma.guestRequest.count({
            where: {
                status: { in: ["Pending", "Approved"] },
                OR: [
                    { reservation: { hotelId } },
                    { guest: { event: { hotelId } } },
                ],
            },
        }),

        prisma.housekeepingTask.count({
            where: {
                hotelId,
                status: { in: ["Pending", "InProgress"] },
            },
        }),
    ]);

    const totalRooms = rooms.length;
    const currentMonthRes = allReservations.filter(
        r => new Date(r.checkIn) >= monthStart && new Date(r.checkIn) <= monthEnd
    );

    // ── 1. Occupancy ─────────────────────────────────────────────
    const checkedInCount = rooms.filter(r => r.status === "Occupied").length;
    const occupancyPct = totalRooms > 0 ? Math.round((checkedInCount / totalRooms) * 100) : 0;
    const roomStatusCounts = rooms.reduce((acc: Record<string, number>, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
    }, {});

    // ── 2. Revenue ───────────────────────────────────────────────
    const monthlyRevenue = invoices
        .filter(i => new Date(i.createdAt) >= monthStart && new Date(i.createdAt) <= monthEnd)
        .reduce((s, i) => s + Number(i.grandTotal), 0);

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.grandTotal), 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInvoices = invoices.filter((invoice) => new Date(invoice.createdAt) >= thirtyDaysAgo);
    const total30d = recentInvoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0);
    const gst30d = recentInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst),
        0,
    );

    // Monthly trend (last 6 months)
    const revenueByMonth: Record<string, number> = {};
    invoices.forEach(inv => {
        const key = new Date(inv.createdAt).toISOString().slice(0, 7);
        revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(inv.grandTotal);
    });
    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const key = date.toISOString().slice(0, 7);
        return { month: key, revenue: revenueByMonth[key] ?? 0 };
    });

    // ── 3. ADR & RevPAR ──────────────────────────────────────────
    const checkedOutRes = currentMonthRes.filter(r => r.status === "CheckedOut");
    const adr = checkedOutRes.length > 0
        ? checkedOutRes.reduce((s, r) => s + Number(r.baseAmount ?? 0), 0) / checkedOutRes.length
        : 0;
    const revpar = totalRooms > 0 ? monthlyRevenue / totalRooms : 0;

    // ── 4. Cancellation Rate ──────────────────────────────────────
    const cancelledCount = currentMonthRes.filter(r => r.status === "Cancelled").length;
    const confirmedCount = currentMonthRes.filter(r => r.status !== "NoShow").length;
    const cancellationRate = confirmedCount > 0
        ? Math.round((cancelledCount / confirmedCount) * 100) : 0;

    // ── 5. Average Stay Length ────────────────────────────────────
    const staysWithDuration = allReservations
        .filter(r => r.actualCheckIn && r.actualCheckOut)
        .map(r => {
            const nights = (new Date(r.actualCheckOut!).getTime() - new Date(r.actualCheckIn!).getTime()) / 86400000;
            return Math.max(1, Math.round(nights));
        });
    const avgStayLength = staysWithDuration.length > 0
        ? (staysWithDuration.reduce((s, n) => s + n, 0) / staysWithDuration.length).toFixed(1)
        : "0";

    // ── 6. Repeat Guest % ────────────────────────────────────────
    const repeatGuests = guests.filter(g => g.totalStays > 1).length;
    const repeatGuestPct = guests.length > 0
        ? Math.round((repeatGuests / guests.length) * 100) : 0;

    // ── 7. Revenue by Source (bookingType) ───────────────────────
    const revenueBySource: Record<string, number> = {};
    allReservations.forEach(r => {
        const src = r.bookingType ?? "Unknown";
        revenueBySource[src] = (revenueBySource[src] ?? 0) + Number(r.totalAmount ?? 0);
    });

    // ── 8. Department Revenue Split (from invoice items) ─────────
    const deptRevenue: Record<string, number> = {};
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            deptRevenue[item.itemType] = (deptRevenue[item.itemType] ?? 0) + Number(item.lineTotal);
        });
    });

    // ── 9. GST Summary ───────────────────────────────────────────
    const gstSummary = invoices.reduce(
        (acc, inv) => {
            const c = Number(inv.cgst);
            const s = Number(inv.sgst);
            const i = Number(inv.igst);
            acc.cgst += c;
            acc.sgst += s;
            acc.igst += i;
            acc.total += c + s + i;
            return acc;
        },
        { cgst: 0, sgst: 0, igst: 0, total: 0 }
    );

    // ── 10. Payment Mode Distribution ────────────────────────────
    const paymentModeDist: Record<string, number> = {};
    payments.forEach(p => {
        paymentModeDist[p.paymentMode] = (paymentModeDist[p.paymentMode] ?? 0) + Number(p.amount);
    });

    // ── 11. No-show count ─────────────────────────────────────────
    const noShowCount = currentMonthRes.filter(r => r.status === "NoShow").length;

    return NextResponse.json({
        // Dashboard-compatible grouped data.
        occupancy: {
            totalRooms,
            occupiedRooms: checkedInCount,
            vacantRooms: roomStatusCounts.Vacant ?? 0,
            dirtyRooms: (roomStatusCounts.Dirty ?? 0) + (roomStatusCounts.Cleaning ?? 0),
            occupancyPct,
        },
        revenue: {
            total30d,
            gst30d,
            adr: Math.round(adr),
            revpar: Math.round(revpar),
        },
        monthlyTrend,
        operations: {
            openComplaints: openRequests,
            pendingHousekeeping,
        },

        // Core KPIs
        occupancyPct,
        monthlyRevenue,
        totalRevenue,
        adr: Math.round(adr),
        revpar: Math.round(revpar),
        totalRooms,
        checkedInCount,
        totalGuests: guestProfiles,

        // Room breakdown
        roomStatusCounts,

        // Revenue trend
        revenueByMonth,

        // New Phase 2 analytics
        cancellationRate,
        avgStayLength: parseFloat(avgStayLength),
        repeatGuestPct,
        revenueBySource,
        deptRevenue,
        paymentModeDist,
        noShowCount,
        cancelledCount,

        // GST
        gstSummary,
    });
}
