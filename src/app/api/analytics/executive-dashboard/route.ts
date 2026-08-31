import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { getOperationalDashboardMetrics } from "@/lib/dashboardAnalytics";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.REPORT_FINANCIAL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const metrics = await getOperationalDashboardMetrics(tenant.hotelId);
        return NextResponse.json(metrics);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to generate dashboard metrics" },
            { status: 500 }
        );
    }
}
