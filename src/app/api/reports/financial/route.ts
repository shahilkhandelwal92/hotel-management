import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";
import { getFinancialYearString } from "@/lib/invoiceSequence";
import { formatHotelBusinessDate, parseHotelBusinessDate, DEFAULT_HOTEL_TIMEZONE } from "@/lib/timezone";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const requestedHotelId = url.searchParams.get("hotelId");
    const requestedFY = url.searchParams.get("fiscalYear");

    const reportAccess = await getReportAccess(request, requestedHotelId);
    if (!reportAccess) {
        return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    }

    const hotelId = reportAccess.hotelId || undefined;

    // 1. Fetch live active property/properties
    const hotels = await prisma.hotel.findMany({
        where: hotelId ? { id: hotelId } : { status: "Active" },
        select: {
            id: true,
            name: true,
            location: true,
            gstin: true,
            roomCount: true,
            state: true,
            timezone: true,
        },
    });

    const hotelIds = hotels.map((h) => h.id);
    const primaryTz = hotels[0]?.timezone || DEFAULT_HOTEL_TIMEZONE;

    // Dynamic Fiscal Year (Default to current Indian Financial Year e.g. "2026-27")
    const currentFY = requestedFY || getFinancialYearString(new Date());

    // Parse start and end dates for Indian Fiscal Year (Apr 1 to Mar 31)
    const [startYearStr] = currentFY.split("-");
    const startYear = parseInt(startYearStr, 10) || new Date().getFullYear();
    const fyStartDate = parseHotelBusinessDate(`${startYear}-04-01`, primaryTz);
    const fyEndDate = parseHotelBusinessDate(`${startYear + 1}-03-31`, primaryTz);
    fyEndDate.setUTCHours(23, 59, 59, 999);

    // 2. Fetch real Invoices for the Fiscal Year
    const invoices = await prisma.invoice.findMany({
        where: {
            hotelId: { in: hotelIds },
            createdAt: { gte: fyStartDate, lte: fyEndDate },
            deletedAt: null,
            status: { not: "Cancelled" },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
    });

    // 3. Fetch real Payroll Records
    const payrollRecords = await prisma.payrollRecord.findMany({
        where: {
            hotelId: { in: hotelIds },
            createdAt: { gte: fyStartDate, lte: fyEndDate },
        },
    });

    // 4. Group Monthly Revenues & Expenses
    const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthlyMap = new Map<string, {
        month: string;
        roomRev: Prisma.Decimal;
        restRev: Prisma.Decimal;
        eventRev: Prisma.Decimal;
        amenityRev: Prisma.Decimal;
        otherRev: Prisma.Decimal;
        payrollExpenses: Prisma.Decimal;
        tds: Prisma.Decimal;
    }>();

    monthOrder.forEach((m) => {
        monthlyMap.set(m, {
            month: m,
            roomRev: new Prisma.Decimal(0),
            restRev: new Prisma.Decimal(0),
            eventRev: new Prisma.Decimal(0),
            amenityRev: new Prisma.Decimal(0),
            otherRev: new Prisma.Decimal(0),
            payrollExpenses: new Prisma.Decimal(0),
            tds: new Prisma.Decimal(0),
        });
    });

    let totalRoomRev = new Prisma.Decimal(0);
    let totalRestRev = new Prisma.Decimal(0);
    let totalEventRev = new Prisma.Decimal(0);
    let totalAmenityRev = new Prisma.Decimal(0);
    let totalOtherRev = new Prisma.Decimal(0);

    for (const inv of invoices) {
        const hotelTz = hotels.find((h) => h.id === inv.hotelId)?.timezone || primaryTz;
        const businessDateStr = formatHotelBusinessDate(inv.createdAt, hotelTz);
        const monthNum = parseInt(businessDateStr.split("-")[1], 10) - 1;
        const monthKey = monthNames[monthNum];
        const monthEntry = monthlyMap.get(monthKey);

        for (const item of inv.items) {
            const lineVal = new Prisma.Decimal(item.lineTotal);
            const itemType = (item.itemType || "").toLowerCase();

            if (itemType === "room") {
                if (monthEntry) monthEntry.roomRev = monthEntry.roomRev.plus(lineVal);
                totalRoomRev = totalRoomRev.plus(lineVal);
            } else if (itemType === "food" || itemType === "restaurant") {
                if (monthEntry) monthEntry.restRev = monthEntry.restRev.plus(lineVal);
                totalRestRev = totalRestRev.plus(lineVal);
            } else if (itemType === "event") {
                if (monthEntry) monthEntry.eventRev = monthEntry.eventRev.plus(lineVal);
                totalEventRev = totalEventRev.plus(lineVal);
            } else if (itemType === "amenity") {
                if (monthEntry) monthEntry.amenityRev = monthEntry.amenityRev.plus(lineVal);
                totalAmenityRev = totalAmenityRev.plus(lineVal);
            } else {
                if (monthEntry) monthEntry.otherRev = monthEntry.otherRev.plus(lineVal);
                totalOtherRev = totalOtherRev.plus(lineVal);
            }
        }
    }

    let totalPayrollGross = new Prisma.Decimal(0);
    let totalTDS = new Prisma.Decimal(0);

    for (const p of payrollRecords) {
        const hotelTz = hotels.find((h) => h.id === p.hotelId)?.timezone || primaryTz;
        const businessDateStr = formatHotelBusinessDate(p.createdAt, hotelTz);
        const monthNum = parseInt(businessDateStr.split("-")[1], 10) - 1;
        const monthKey = monthNames[monthNum];
        const monthEntry = monthlyMap.get(monthKey);

        const grossVal = new Prisma.Decimal(p.grossSalary);
        const tdsVal = new Prisma.Decimal(p.tds);

        if (monthEntry) {
            monthEntry.payrollExpenses = monthEntry.payrollExpenses.plus(grossVal);
            monthEntry.tds = monthEntry.tds.plus(tdsVal);
        }
        totalPayrollGross = totalPayrollGross.plus(grossVal);
        totalTDS = totalTDS.plus(tdsVal);
    }

    const totalRevenue = totalRoomRev.plus(totalRestRev).plus(totalEventRev).plus(totalAmenityRev).plus(totalOtherRev);
    const totalExpenses = totalPayrollGross;
    const ebitda = totalRevenue.minus(totalExpenses);
    const taxProvision = ebitda.greaterThan(0) ? ebitda.times(0.25).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
    const netProfit = ebitda.minus(taxProvision);

    const monthlyTrend = monthOrder.map((m) => {
        const entry = monthlyMap.get(m)!;
        return {
            month: m,
            roomRev: entry.roomRev.toNumber(),
            restRev: entry.restRev.toNumber(),
            eventRev: entry.eventRev.toNumber(),
            amenityRev: entry.amenityRev.toNumber(),
            otherRev: entry.otherRev.toNumber(),
            expenses: entry.payrollExpenses.toNumber(),
            tds: entry.tds.toNumber(),
        };
    });

    const tdsBreakdown = [
        { section: "192B - Salaries (TDS on Payroll)", amount: totalTDS.toNumber(), rate: "Slab Rate" },
        { section: "194C - Contractor Payments", amount: 0, rate: "2%" },
        { section: "194I - Rent", amount: 0, rate: "10%" },
        { section: "194J - Professional Fees", amount: 0, rate: "10%" },
    ];

    const ebitdaMargin = totalRevenue.greaterThan(0)
        ? ebitda.dividedBy(totalRevenue).times(100).toFixed(1)
        : "0.0";
    const netProfitMargin = totalRevenue.greaterThan(0)
        ? netProfit.dividedBy(totalRevenue).times(100).toFixed(1)
        : "0.0";

    return NextResponse.json({
        reportTitle: "Management Financial & P&L Statement",
        fiscalYear: currentFY,
        period: {
            from: fyStartDate.toISOString().slice(0, 10),
            to: fyEndDate.toISOString().slice(0, 10),
        },
        hotels: hotels.map((h) => ({
            id: h.id,
            name: h.name,
            location: h.location,
            gstin: h.gstin || "Not Configured",
            rooms: h.roomCount,
            state: h.state || "Maharashtra",
        })),
        summary: {
            totalRevenue: totalRevenue.toNumber(),
            roomRevenue: totalRoomRev.toNumber(),
            restaurantRevenue: totalRestRev.toNumber(),
            eventRevenue: totalEventRev.toNumber(),
            amenityRevenue: totalAmenityRev.toNumber(),
            otherRevenue: totalOtherRev.toNumber(),
            totalExpenses: totalExpenses.toNumber(),
            payrollExpenses: totalPayrollGross.toNumber(),
            ebitda: ebitda.toNumber(),
            ebitdaMargin,
            taxProvision: taxProvision.toNumber(),
            netProfit: netProfit.toNumber(),
            netProfitMargin,
            totalTDSDeducted: totalTDS.toNumber(),
        },
        monthlyTrend,
        tdsBreakdown,
        complianceStatus: {
            gstConfigured: hotels.some((h) => Boolean(h.gstin)),
            tdsFiled: totalTDS.greaterThan(0),
            itrFiled: false,
            auditRequired: totalRevenue.greaterThan(10000000),
        },
    });
}
