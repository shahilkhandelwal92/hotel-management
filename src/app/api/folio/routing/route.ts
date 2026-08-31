import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { configureRoutingRule } from "@/lib/splitFolio";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.FOLIO_ROUTE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const body = await req.json();
        const { folioId, targetWindowId, chargeCategory } = body;

        const rule = await configureRoutingRule({
            folioId,
            targetWindowId,
            chargeCategory,
        });

        return NextResponse.json({ rule }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create routing rule" },
            { status: 500 }
        );
    }
}
