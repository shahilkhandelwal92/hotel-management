import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { resolveTenantContext } from "@/lib/tenantContext";

export async function GET(request: NextRequest) {
    const permResult = await requirePermission(request, PERMISSIONS.REPORT_FINANCIAL);
    if ("errorResponse" in permResult) return permResult.errorResponse;

    const tenantResult = await resolveTenantContext(request);
    if (!tenantResult.success) return tenantResult.response;

    const hotelId = tenantResult.context.hotelId;

    // Fetch actual hotel properties and their configurations
    const hotels = await prisma.hotel.findMany({
        where: hotelId ? { id: hotelId } : { status: "Active" },
        include: {
            taxConfigs: true,
            saasSubscription: { include: { plan: true } },
        },
    });

    const compliance = hotels.map((h) => {
        const hasGstin = Boolean(h.gstin && h.gstin.trim());
        const hasTaxConfig = h.taxConfigs.length > 0;
        const currentYear = new Date().getFullYear();

        const items = [
            {
                law: "GST Registration & Tax Configuration",
                section: "CGST Act 2017 Sec 22",
                status: hasGstin ? "Configured" : "Action Required",
                expiry: "Perpetual",
                action: hasGstin ? "Property GSTIN Configured" : "Configure Hotel GSTIN in Property Settings",
            },
            {
                law: "Annual Financial Tax Configuration (FY " + currentYear + "-" + (currentYear + 1) + ")",
                section: "State/Central Tax Rules",
                status: hasTaxConfig ? "Configured" : "Action Required",
                expiry: `${currentYear + 1}-03-31`,
                action: hasTaxConfig ? "Active Tax Rates Configured" : "Set up Tax Configuration for current financial year",
            },
            {
                law: "SaaS Platform License",
                section: "StayOS License",
                status: h.saasSubscription?.status === "Active" || h.saasSubscription?.status === "Trial" ? "Configured" : "Action Required",
                expiry: h.saasSubscription?.currentPeriodEnd ? h.saasSubscription.currentPeriodEnd.toISOString().slice(0, 10) : "Active",
                action: h.saasSubscription ? `Plan: ${h.saasSubscription.plan.displayName}` : "Active License",
            },
            {
                law: "External Statutory Filings (GSTR-1, GSTR-3B, TDS)",
                section: "External Portal Filing",
                status: "Not Implemented",
                expiry: "Monthly/Quarterly",
                action: "External filing verification requires GSTN integration",
            },
        ];

        return {
            hotelName: h.name,
            location: h.location,
            gstin: h.gstin || "Not Configured",
            items,
        };
    });

    const summary = {
        reportTitle: "Compliance & Configuration Readiness",
        totalHotels: compliance.length,
        totalConfigured: compliance.reduce((s, h) => s + h.items.filter((i) => i.status === "Configured").length, 0),
        totalActionRequired: compliance.reduce((s, h) => s + h.items.filter((i) => i.status === "Action Required").length, 0),
        totalNotImplemented: compliance.reduce((s, h) => s + h.items.filter((i) => i.status === "Not Implemented").length, 0),
        hotelsWithIssues: compliance.filter((h) => h.items.some((i) => i.status === "Action Required")).map((h) => h.hotelName),
    };

    return NextResponse.json({ summary, hotels: compliance });
}
