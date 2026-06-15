import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * requireFeature — Subscription gating helper
 * ─────────────────────────────────────────────────────────────
 * Checks if a hotel's SaaS subscription includes a specific feature.
 *
 * Feature access is determined by:
 *   Hotel → SaasSubscription → SaasPlan → SaasPlanFeature → Feature.code
 *
 * Usage in API routes:
 *   const guard = await requireFeature(hotelId, "SMART_ACCESS_QR");
 *   if (guard) return guard; // Returns 402 response if not subscribed
 *
 * Feature codes (stored in Feature.code):
 *   SMART_ACCESS_QR          — QR Staff Attendance (₹1,999/month)
 *   SMART_ACCESS_MOBILE_KEY  — Mobile Key Integration (₹4,999/month)
 *   SMART_ACCESS_VENDOR_API  — Door Lock Vendor API (₹7,999/month)
 *   SMART_ACCESS_COMMON_AREA — Common Area Access (₹2,999/month)
 */

type FeatureCode =
    | "SMART_ACCESS_QR"
    | "SMART_ACCESS_MOBILE_KEY"
    | "SMART_ACCESS_VENDOR_API"
    | "SMART_ACCESS_COMMON_AREA"
    | "NIGHT_AUDIT"
    | "POS"
    | "CRM"
    | "PAYROLL"
    | "PMS"
    | "EVENTS"
    | "ANALYTICS";

const FEATURE_PRICES: Record<string, string> = {
    SMART_ACCESS_QR: "₹1,999/month",
    SMART_ACCESS_MOBILE_KEY: "₹4,999/month",
    SMART_ACCESS_VENDOR_API: "₹7,999/month",
    SMART_ACCESS_COMMON_AREA: "₹2,999/month",
    NIGHT_AUDIT: "₹999/month",
    POS: "₹2,499/month",
    CRM: "₹1,499/month",
    PAYROLL: "₹3,499/month",
};

export async function requireFeature(
    hotelId: string,
    featureCode: FeatureCode
): Promise<NextResponse | null> {
    const sub = await prisma.saasSubscription.findUnique({
        where: { hotelId },
        select: {
            status: true,
            plan: {
                select: {
                    name: true,
                    features: {
                        select: {
                            enabled: true,
                            feature: { select: { code: true } },
                        },
                    },
                },
            },
        },
    });

    // No subscription at all
    if (!sub) {
        return NextResponse.json(
            {
                error: "No active subscription",
                feature: featureCode,
                upgradeRequired: true,
                price: FEATURE_PRICES[featureCode] ?? "Contact sales",
                upgradeUrl: "/admin/subscription",
            },
            { status: 402 }
        );
    }

    // Subscription not active
    if (sub.status !== "Active" && sub.status !== "Trial") {
        return NextResponse.json(
            { error: `Subscription status: ${sub.status}. Please renew to access this feature.` },
            { status: 402 }
        );
    }

    // ENTERPRISE plan gets everything
    if (sub.plan.name === "enterprise") {
        return null; // ✅ allowed
    }

    // Check feature in plan
    const hasFeature = sub.plan.features.some(
        (pf: { enabled: boolean; feature: { code: string } }) => pf.enabled && pf.feature.code === featureCode
    );

    if (!hasFeature) {
        return NextResponse.json(
            {
                error: `Feature '${featureCode}' is not included in your ${sub.plan.name} plan.`,
                feature: featureCode,
                planName: sub.plan.name,
                upgradeRequired: true,
                price: FEATURE_PRICES[featureCode] ?? "Contact sales",
                upgradeUrl: "/admin/subscription",
            },
            { status: 402 }
        );
    }

    return null; // ✅ allowed
}
