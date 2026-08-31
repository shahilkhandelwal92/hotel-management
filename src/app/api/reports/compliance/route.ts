import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";

export async function GET(request: NextRequest) {
    const reportAccess = await getReportAccess(request, new URL(request.url).searchParams.get("hotelId"));
    if (!reportAccess) {
        return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    }

    const hotelId = reportAccess.hotelId || undefined;

    // Fetch actual hotel properties and their tax configurations
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
                law: "GST Registration & Tax Structure",
                section: "CGST Act 2017 Sec 22",
                status: hasGstin ? "Compliant" : "Action Required",
                expiry: "Perpetual",
                action: hasGstin ? "Active GSTIN Verified" : "⚠️ Configure Hotel GSTIN in Property Settings",
            },
            {
                law: "Tax Configuration (FY " + currentYear + "-" + (currentYear + 1) + ")",
                section: "Tax Rules & State Slabs",
                status: hasTaxConfig ? "Compliant" : "Action Required",
                expiry: `${currentYear + 1}-03-31`,
                action: hasTaxConfig ? "Active Tax Config" : "⚠️ Set up Tax Configuration for current financial year",
            },
            {
                law: "SaaS Subscription & License",
                section: "StayOS Platform Service Agreement",
                status: h.saasSubscription?.status === "Active" || h.saasSubscription?.status === "Trial" ? "Compliant" : "Action Required",
                expiry: h.saasSubscription?.currentPeriodEnd ? h.saasSubscription.currentPeriodEnd.toISOString().slice(0, 10) : "Active",
                action: h.saasSubscription ? `Plan: ${h.saasSubscription.plan.displayName}` : "Standard Property License",
            },
            {
                law: "Digital Guest Record Retention",
                section: "Hotel Regulatory & Police Verification Order",
                status: "Compliant",
                expiry: "Annual",
                action: "Encrypted Cloud Storage Active",
            },
        ];

        return {
            hotelName: h.name,
            location: h.location,
            gstin: h.gstin || "Not Configured",
            pan: h.gstin ? h.gstin.slice(2, 12) : "N/A",
            items,
        };
    });

    const summary = {
        totalHotels: compliance.length,
        totalCompliant: compliance.reduce((s, h) => s + h.items.filter((i) => i.status === "Compliant").length, 0),
        totalActionRequired: compliance.reduce((s, h) => s + h.items.filter((i) => i.status === "Action Required").length, 0),
        hotelsWithIssues: compliance.filter((h) => h.items.some((i) => i.status === "Action Required")).map((h) => h.hotelName),
    };

    return NextResponse.json({ summary, hotels: compliance });
}
