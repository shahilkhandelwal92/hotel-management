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

    // 1. Fetch live active property/properties
    const hotels = await prisma.hotel.findMany({
        where: hotelId ? { id: hotelId } : { status: "Active" },
        select: { id: true, name: true, gstin: true, state: true },
    });

    const hotelIds = hotels.map((h) => h.id);

    // 2. Fetch real Invoices with line items
    const invoices = await prisma.invoice.findMany({
        where: {
            hotelId: { in: hotelIds },
            deletedAt: null,
            status: { not: "Cancelled" },
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
    });

    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalGSTLiability = 0;

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

    const departmentGST: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {
        Room: { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
        Food: { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
        Amenity: { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
        Event: { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
        Other: { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
    };

    for (const inv of invoices) {
        const taxable = Number(inv.subTotal);
        const invCGST = Number(inv.cgst);
        const invSGST = Number(inv.sgst);
        const invIGST = Number(inv.igst);
        const invTax = Number(inv.totalTax);
        const invGrandTotal = Number(inv.grandTotal);

        totalTaxableValue += taxable;
        totalCGST += invCGST;
        totalSGST += invSGST;
        totalIGST += invIGST;
        totalGSTLiability += invTax;

        const isB2B = inv.invoiceFormat === "B2B" || Boolean(inv.billedToGstin && inv.billedToGstin.trim());

        if (isB2B) {
            b2bSupplies.push({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.createdAt.toISOString().slice(0, 10),
                billedToName: inv.billedToName,
                billedToGstin: inv.billedToGstin || "N/A",
                taxableValue: Math.round(taxable),
                cgst: Math.round(invCGST),
                sgst: Math.round(invSGST),
                igst: Math.round(invIGST),
                totalTax: Math.round(invTax),
                grandTotal: Math.round(invGrandTotal),
            });
        } else {
            b2cSupplies.push({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.createdAt.toISOString().slice(0, 10),
                taxableValue: Math.round(taxable),
                cgst: Math.round(invCGST),
                sgst: Math.round(invSGST),
                igst: Math.round(invIGST),
                totalTax: Math.round(invTax),
                grandTotal: Math.round(invGrandTotal),
            });
        }

        // Department item breakdown
        for (const item of inv.items) {
            const deptKey = item.itemType in departmentGST ? item.itemType : "Other";
            const itemTaxable = Number(item.lineTotal) - Number(item.taxAmount);
            departmentGST[deptKey].taxable += itemTaxable;
            departmentGST[deptKey].cgst += Number(item.cgstAmount ?? 0);
            departmentGST[deptKey].sgst += Number(item.sgstAmount ?? 0);
            departmentGST[deptKey].igst += Number(item.igstAmount ?? 0);
            departmentGST[deptKey].totalTax += Number(item.taxAmount);
        }
    }

    const inputTaxCredit = 0; // Estimated or configured from purchase invoices
    const netGSTPayable = Math.max(0, totalGSTLiability - inputTaxCredit);

    return NextResponse.json({
        summary: {
            totalTaxableValue: Math.round(totalTaxableValue),
            totalGSTLiability: Math.round(totalGSTLiability),
            cgst: Math.round(totalCGST),
            sgst: Math.round(totalSGST),
            igst: Math.round(totalIGST),
            inputTaxCredit: Math.round(inputTaxCredit),
            netGSTPayable: Math.round(netGSTPayable),
        },
        departmentBreakdown: departmentGST,
        gstr1: {
            b2bSupplies,
            b2cSupplies,
        },
    });
}
