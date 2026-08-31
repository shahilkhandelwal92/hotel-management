import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { processOutboxBatch } from "@/lib/outboxEngine";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.OUTBOX_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const results = await processOutboxBatch(20);
        return NextResponse.json({ processed: results.length, results });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Outbox dispatch failed" },
            { status: 500 }
        );
    }
}
