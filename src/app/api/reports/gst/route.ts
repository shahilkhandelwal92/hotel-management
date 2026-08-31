import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";
import { parseHotelBusinessDate, formatHotelBusinessDate, DEFAULT_HOTEL_TIMEZONE } from "@/lib/timezone";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const requestedHotelId = url.searchParams.get("hotelId");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const monthParam = url.searchParams.get("month"); // e.g. "2026-04"
    const fyParam = url.searchParams.get("financialYear"); // e.g. "2026-27"

    const reportAccess = await getReportAccess(request, requestedHotelId);
    if (!reportAccess) {
        return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    }

    const hotelId = reportAccess.hotelId || undefined;

    // 1. Fetch live active property/properties
    const hotels = await prisma.hotel.findMany({
        where: hotelId ? { id: hotelId } : { status: "Active" },
        select: { id: true, name: true, gstin: true, state: true, timezone: true },
    });

    const hotelIds = hotels.map((h) => h.id);
    const primaryTz = hotels[0]?.timezone || DEFAULT_HOTEL_TIMEZONE;

    // Determine period boundaries
    let startDate: Date;
    let endDate: Date;

    if (fromParam && toParam) {
        startDate = parseHotelBusinessDate(fromParam, primaryTz);
        endDate = parseHotelBusinessDate(toParam, primaryTz);
        endDate.setUTCHours(23, 59, 59, 999);
    } else if (monthParam) {
        const [yr, mo] = monthParam.split("-").map(Number);
        startDate = parseHotelBusinessDate(`${yr}-${String(mo).padStart(2, "0")}-01`, primaryTz);
        const lastDay = new Date(yr, mo, 0).getDate();
        endDate = parseHotelBusinessDate(`${yr}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, primaryTz);
        endDate.setUTCHours(23, 59, 59, 999);
    } else if (fyParam) {
        const [startYearStr] = fyParam.split("-");
        const startYear = parseInt(startYearStr, 10) || new Date().getFullYear();
        startDate = parseHotelBusinessDate(`${startYear}-04-01`, primaryTz);
        endDate = parseHotelBusinessDate(`${startYear + 1}-03-31`, primaryTz);
        endDate.setUTCHours(23, 59, 59, 999);
    } else {
        // Default to current month
        const now = new Date();
        const nowStr = formatHotelBusinessDate(now, primaryTz);
        const [yr, mo] = nowStr.split("-").map(Number);
        startDate = parseHotelBusinessDate(`${yr}-${String(mo).padStart(2, "0")}-01`, primaryTz);
        const lastDay = new Date(yr, mo, 0).getDate();
        endDate = parseHotelBusinessDate(`${yr}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, primaryTz);
        endDate.setUTCHours(23, 59, 59, 999);
    }

    // 2. Fetch real Invoices with line items in the filtered period
    const invoices = await prisma.invoice.findMany({
        where: {
            hotelId: { in: hotelIds },
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
            status: { not: "Cancelled" },
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
    });

    let totalTaxableValue = new Prisma.Decimal(0);
    let totalCGST = new Prisma.Decimal(0);
    let totalSGST = new Prisma.Decimal(0);
    let totalIGST = new Prisma.Decimal(0);
    let totalGSTLiability = new Prisma.Decimal(0);

    const b2bSupplies: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        billedToName: string;
        billedToGstin: string;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
        grandTotal: number;
    }> = [];

    const b2cSupplies: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
        grandTotal: number;
    }> = [];

    const departmentGST: Record<string, {
        taxable: Prisma.Decimal;
        cgst: Prisma.Decimal;
        sgst: Prisma.Decimal;
        igst: Prisma.Decimal;
        totalTax: Prisma.Decimal;
    }> = {
        Room: { taxable: new Prisma.Decimal(0), cgst: new Prisma.Decimal(0), sgst: new Prisma.Decimal(0), igst: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0) },
        Food: { taxable: new Prisma.Decimal(0), cgst: new Prisma.Decimal(0), sgst: new Prisma.Decimal(0), igst: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0) },
        Amenity: { taxable: new Prisma.Decimal(0), cgst: new Prisma.Decimal(0), sgst: new Prisma.Decimal(0), igst: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0) },
        Event: { taxable: new Prisma.Decimal(0), cgst: new Prisma.Decimal(0), sgst: new Prisma.Decimal(0), igst: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0) },
        Other: { taxable: new Prisma.Decimal(0), cgst: new Prisma.Decimal(0), sgst: new Prisma.Decimal(0), igst: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0) },
    };

    for (const inv of invoices) {
        const taxable = new Prisma.Decimal(inv.subTotal);
        const invCGST = new Prisma.Decimal(inv.cgst);
        const invSGST = new Prisma.Decimal(inv.sgst);
        const invIGST = new Prisma.Decimal(inv.igst);
        const invTax = new Prisma.Decimal(inv.totalTax);
        const invGrandTotal = new Prisma.Decimal(inv.grandTotal);

        totalTaxableValue = totalTaxableValue.plus(taxable);
        totalCGST = totalCGST.plus(invCGST);
        totalSGST = totalSGST.plus(invSGST);
        totalIGST = totalIGST.plus(invIGST);
        totalGSTLiability = totalGSTLiability.plus(invTax);

        const isB2B = inv.invoiceFormat === "B2B" || Boolean(inv.billedToGstin && inv.billedToGstin.trim());
        const invDateStr = formatHotelBusinessDate(inv.createdAt, primaryTz);

        if (isB2B) {
            b2bSupplies.push({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: invDateStr,
                billedToName: inv.billedToName,
                billedToGstin: inv.billedToGstin || "N/A",
                taxableValue: taxable.toNumber(),
                cgst: invCGST.toNumber(),
                sgst: invSGST.toNumber(),
                igst: invIGST.toNumber(),
                totalTax: invTax.toNumber(),
                grandTotal: invGrandTotal.toNumber(),
            });
        } else {
            b2cSupplies.push({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: invDateStr,
                taxableValue: taxable.toNumber(),
                cgst: invCGST.toNumber(),
                sgst: invSGST.toNumber(),
                igst: invIGST.toNumber(),
                totalTax: invTax.toNumber(),
                grandTotal: invGrandTotal.toNumber(),
            });
        }

        // Department line items breakdown
        for (const item of inv.items) {
            const deptKey = item.itemType in departmentGST ? item.itemType : "Other";
            const itemTax = new Prisma.Decimal(item.taxAmount);
            const itemTaxable = new Prisma.Decimal(item.lineTotal).minus(itemTax);

            departmentGST[deptKey].taxable = departmentGST[deptKey].taxable.plus(itemTaxable);
            departmentGST[deptKey].cgst = departmentGST[deptKey].cgst.plus(new Prisma.Decimal(item.cgstAmount ?? 0));
            departmentGST[deptKey].sgst = departmentGST[deptKey].sgst.plus(new Prisma.Decimal(item.sgstAmount ?? 0));
            departmentGST[deptKey].igst = departmentGST[deptKey].igst.plus(new Prisma.Decimal(item.igstAmount ?? 0));
            departmentGST[deptKey].totalTax = departmentGST[deptKey].totalTax.plus(itemTax);
        }
    }

    // Input Tax Credit (ITC) - Clearly marked as Configured Purchase ITC
    const configuredITC = new Prisma.Decimal(0); // Explicitly 0.00 until purchase vouchers are integrated
    const netGSTEstimate = totalGSTLiability.minus(configuredITC);

    const serializedDeptBreakdown = Object.fromEntries(
        Object.entries(departmentGST).map(([k, v]) => [
            k,
            {
                taxable: v.taxable.toNumber(),
                cgst: v.cgst.toNumber(),
                sgst: v.sgst.toNumber(),
                igst: v.igst.toNumber(),
                totalTax: v.totalTax.toNumber(),
            },
        ])
    );

    return NextResponse.json({
        reportTitle: "GSTR-1 Statutory Return & GST Liability Summary",
        period: {
            from: formatHotelBusinessDate(startDate, primaryTz),
            to: formatHotelBusinessDate(endDate, primaryTz),
        },
        summary: {
            totalInvoicesCount: invoices.length,
            totalTaxableValue: totalTaxableValue.toNumber(),
            outputGSTLiability: totalGSTLiability.toNumber(),
            totalCGST: totalCGST.toNumber(),
            totalSGST: totalSGST.toNumber(),
            totalIGST: totalIGST.toNumber(),
            configuredInputTaxCredit: configuredITC.toNumber(),
            netGSTLiabilityPayable: netGSTEstimate.toNumber(),
            itcAccountingMode: "Purchase Invoices ITC (Configured / Recorded Vouchers)",
        },
        departmentBreakdown: serializedDeptBreakdown,
        gstr1: {
            b2bCount: b2bSupplies.length,
            b2cCount: b2cSupplies.length,
            b2bSupplies,
            b2cSupplies,
        },
    });
}
