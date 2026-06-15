/**
 * Data Export API — CSV exports for reservations, GST, payroll, analytics
 * GET /api/export?type=reservations|gst|payroll|analytics&hotelId=&from=&to=
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";



function toCSV(rows: Record<string, any>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
        const s = v == null ? "" : String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
    };
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "reservations";

    // ── Tenant isolation — ALWAYS from middleware header ──────────
    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";
    const isAdmin = isSA || injectedRole === "HOTEL_ADMIN" || injectedRole === "ADMIN";

    // SA can export any hotel via query param; staff locked to their hotel
    const hotelId = isSA
        ? (searchParams.get("hotelId") ?? injectedHotelId)
        : injectedHotelId;

    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    // ── Role gates for sensitive exports ─────────────────────────
    if ((type === "gst" || type === "payroll") && !isAdmin) {
        return NextResponse.json(
            { error: `Access denied: ${type.toUpperCase()} export requires ADMIN or OWNER role. Contact your manager.` },
            { status: 403 }
        );
    }

    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86400000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    to.setHours(23, 59, 59, 999);

    let rows: Record<string, any>[] = [];
    let filename = `${type}_export_${new Date().toISOString().slice(0, 10)}`;

    // ── RESERVATIONS ─────────────────────────────────────────────
    if (type === "reservations") {
        const data = await prisma.reservation.findMany({
            where: { hotelId, checkIn: { gte: from, lte: to }, deletedAt: null },
            include: { room: { select: { number: true, type: true } } },
            orderBy: { checkIn: "desc" },
        });
        rows = data.map((r) => ({
            "Booking Ref": r.bookingRef,
            "Guest Name": r.guestName,
            "Phone": r.guestPhone,
            "Email": r.guestEmail ?? "",
            "Room": r.room?.number ?? "",
            "Room Type": r.room?.type ?? "",
            "Check-In": new Date(r.checkIn).toLocaleDateString("en-IN"),
            "Check-Out": new Date(r.checkOut).toLocaleDateString("en-IN"),
            "Adults": r.adults,
            "Status": r.status,
            "Booking Type": r.bookingType,
            "Base Amount": r.baseAmount.toFixed(2),
            "Tax Amount": r.taxAmount.toFixed(2),
            "Total": r.totalAmount.toFixed(2),
            "Advance": r.advanceDeposit.toFixed(2),
            "Balance": r.balanceDue.toFixed(2),
            "Rate Plan": r.ratePlan ?? "",
            "GSTIN": r.guestGstin ?? "",
            "State": r.guestState ?? "",
        }));
        filename = `reservations_${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;
    }

    // ── GST REPORT ───────────────────────────────────────────────
    else if (type === "gst") {
        const data = await prisma.invoice.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
            include: { items: true },
            orderBy: { createdAt: "desc" },
        });
        rows = data.map((inv) => ({
            "Invoice No": inv.invoiceNumber,
            "Invoice Date": new Date(inv.createdAt).toLocaleDateString("en-IN"),
            "Invoice Type": inv.invoiceType,
            "Invoice Format": inv.invoiceFormat ?? "B2C",
            "Billed To": inv.billedToName,
            "GSTIN": inv.billedToGstin ?? "",
            "State": inv.billedToState ?? "",
            "Sub Total": inv.subTotal.toFixed(2),
            "CGST": inv.cgst.toFixed(2),
            "SGST": inv.sgst.toFixed(2),
            "IGST": inv.igst.toFixed(2),
            "Total Tax": inv.totalTax.toFixed(2),
            "Grand Total": inv.grandTotal.toFixed(2),
            "Status": inv.status,
            "Reverse Charge": inv.isReverseCharge ? "Yes" : "No",
            "Exempt": inv.isExempt ? "Yes" : "No",
        }));
        filename = `gst_report_${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;
    }

    // ── PAYROLL ──────────────────────────────────────────────────
    else if (type === "payroll") {
        const data = await prisma.payrollRecord.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
        });
        rows = data.map((p) => ({
            "Employee": (p as any).user?.name ?? "",
            "Email": (p as any).user?.email ?? "",
            "Month": (p as any).month ?? new Date(p.createdAt).toISOString().slice(0, 7),
            "Basic": (p as any).basicSalary?.toFixed(2) ?? "0.00",
            "HRA": (p as any).hra?.toFixed(2) ?? "0.00",
            "Allowances": (p as any).allowances?.toFixed(2) ?? "0.00",
            "Gross": (p as any).grossSalary?.toFixed(2) ?? "0.00",
            "PF Deduction": (p as any).pfDeduction?.toFixed(2) ?? "0.00",
            "TDS": (p as any).tdsDeduction?.toFixed(2) ?? "0.00",
            "Net Pay": (p as any).netSalary?.toFixed(2) ?? "0.00",
            "Status": (p as any).status ?? "",
        }));
        filename = `payroll_${from.toISOString().slice(0, 7)}`;
    }

    // ── ANALYTICS SUMMARY ────────────────────────────────────────
    else if (type === "analytics") {
        const [resCount, invoiceTotal, nightAudits] = await Promise.all([
            prisma.reservation.groupBy({
                by: ["status"],
                where: { hotelId, checkIn: { gte: from, lte: to }, deletedAt: null },
                _count: { status: true },
                _sum: { totalAmount: true },
            }),
            prisma.invoice.aggregate({
                where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
                _sum: { grandTotal: true, cgst: true, sgst: true, igst: true },
                _count: { id: true },
            }),
            prisma.nightAudit.findMany({
                where: { hotelId, auditDate: { gte: from, lte: to } },
                orderBy: { auditDate: "asc" },
            }),
        ]);

        rows = nightAudits.map((a) => ({
            "Date": new Date(a.auditDate).toLocaleDateString("en-IN"),
            "Room Revenue": a.roomRevenue.toFixed(2),
            "F&B Revenue": a.fbRevenue.toFixed(2),
            "Amenity Revenue": a.amenityRevenue.toFixed(2),
            "Event Revenue": a.eventRevenue.toFixed(2),
            "Other Revenue": a.otherRevenue.toFixed(2),
            "Total Revenue": a.totalRevenue.toFixed(2),
            "Occupancy %": a.occupancyPct,
            "Occupied Rooms": a.occupiedRooms,
            "Total Rooms": a.totalRooms,
            "Audit Status": a.isDayClosed ? "Closed" : "Open",
        }));
        filename = `analytics_${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;
    }

    // ── Return CSV ────────────────────────────────────────────────
    const csv = toCSV(rows);
    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
            "Cache-Control": "no-store",
        },
    });
}
