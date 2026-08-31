import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const reportAccess = await getReportAccess(request, url.searchParams.get("hotelId"));
    if (!reportAccess) {
        return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    }

    const hotelId = reportAccess.hotelId || undefined;
    const currentFY = "2025-2026";

    // 1. Fetch real hotel properties
    const hotels = await prisma.hotel.findMany({
        where: hotelId ? { id: hotelId } : { status: "Active" },
        select: {
            id: true,
            name: true,
            location: true,
            gstin: true,
            roomCount: true,
            state: true,
        },
    });

    const hotelIds = hotels.map((h) => h.id);

    // 2. Fetch real Invoices with Items
    const invoices = await prisma.invoice.findMany({
        where: {
            hotelId: { in: hotelIds },
            deletedAt: null,
            status: { not: "Cancelled" },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
    });

    // 3. Fetch real Payroll Records (Expenses & TDS)
    const payrollRecords = await prisma.payrollRecord.findMany({
        where: {
            hotelId: { in: hotelIds },
        },
    });

    // 4. Group Monthly Revenues & Expenses
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map<string, {
        month: string;
        roomRev: number;
        restRev: number;
        eventRev: number;
        amenityRev: number;
        expenses: number;
        tds: number;
    }>();

    monthNames.forEach((m) => {
        monthlyMap.set(m, {
            month: m,
            roomRev: 0,
            restRev: 0,
            eventRev: 0,
            amenityRev: 0,
            expenses: 0,
            tds: 0,
        });
    });

    let totalRoomRev = 0;
    let totalRestRev = 0;
    let totalEventRev = 0;
    let totalAmenityRev = 0;
    let totalOtherRev = 0;

    for (const inv of invoices) {
        const d = new Date(inv.createdAt);
        const monthKey = monthNames[d.getMonth()];
        const monthEntry = monthlyMap.get(monthKey)!;

        for (const item of inv.items) {
            const lineVal = item.lineTotal;
            switch (item.itemType.toLowerCase()) {
                case "room":
                    monthEntry.roomRev += lineVal;
                    totalRoomRev += lineVal;
                    break;
                case "food":
                case "restaurant":
                    monthEntry.restRev += lineVal;
                    totalRestRev += lineVal;
                    break;
                case "event":
                    monthEntry.eventRev += lineVal;
                    totalEventRev += lineVal;
                    break;
                case "amenity":
                    monthEntry.amenityRev += lineVal;
                    totalAmenityRev += lineVal;
                    break;
                default:
                    totalOtherRev += lineVal;
                    break;
            }
        }
    }

    let totalPayrollGross = 0;
    let totalTDS = 0;

    for (const p of payrollRecords) {
        const d = new Date(p.createdAt);
        const monthKey = monthNames[d.getMonth()];
        const monthEntry = monthlyMap.get(monthKey);
        if (monthEntry) {
            monthEntry.expenses += p.grossSalary;
            monthEntry.tds += p.tds;
        }
        totalPayrollGross += p.grossSalary;
        totalTDS += p.tds;
    }

    const totalRevenue = totalRoomRev + totalRestRev + totalEventRev + totalAmenityRev + totalOtherRev;
    const totalExpenses = totalPayrollGross;
    const ebitda = totalRevenue - totalExpenses;
    const taxProvision = ebitda > 0 ? ebitda * 0.25 : 0;
    const netProfit = ebitda - taxProvision;

    const monthlyTrend = Array.from(monthlyMap.values()).map((m) => ({
        ...m,
        roomRev: Math.round(m.roomRev),
        restRev: Math.round(m.restRev),
        eventRev: Math.round(m.eventRev),
        amenityRev: Math.round(m.amenityRev),
        expenses: Math.round(m.expenses),
        tds: Math.round(m.tds),
    }));

    const tdsBreakdown = [
        { section: "192B - Salaries (TDS on Payroll)", amount: Math.round(totalTDS), rate: "Slab Rate" },
        { section: "194C - Contractor Payments", amount: 0, rate: "2%" },
        { section: "194I - Rent", amount: 0, rate: "10%" },
        { section: "194J - Professional Fees", amount: 0, rate: "10%" },
    ];

    return NextResponse.json({
        fiscalYear: currentFY,
        hotels: hotels.map((h) => ({
            id: h.id,
            name: h.name,
            location: h.location,
            gstin: h.gstin || "Not Configured",
            rooms: h.roomCount,
            state: h.state || "Maharashtra",
        })),
        summary: {
            totalRevenue: Math.round(totalRevenue),
            roomRevenue: Math.round(totalRoomRev),
            restaurantRevenue: Math.round(totalRestRev),
            eventRevenue: Math.round(totalEventRev),
            amenityRevenue: Math.round(totalAmenityRev),
            otherRevenue: Math.round(totalOtherRev),
            totalExpenses: Math.round(totalExpenses),
            ebitda: Math.round(ebitda),
            ebitdaMargin: totalRevenue > 0 ? ((ebitda / totalRevenue) * 100).toFixed(1) : "0.0",
            taxProvision: Math.round(taxProvision),
            netProfit: Math.round(netProfit),
            netProfitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0",
            totalTDSDeducted: Math.round(totalTDS),
        },
        monthlyTrend,
        tdsBreakdown,
        complianceStatus: {
            gstConfigured: hotels.some((h) => Boolean(h.gstin)),
            tdsFiled: totalTDS > 0,
            itrFiled: false,
            auditRequired: totalRevenue > 10000000,
        },
    });
}
