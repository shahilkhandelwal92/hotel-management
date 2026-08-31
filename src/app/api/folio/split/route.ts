import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createFolioWindow,
    transferBetweenFolioWindows,
    getFolioWindowsSummary,
} from "@/lib/splitFolio";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.FOLIO_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { searchParams } = new URL(req.url);
    const folioId = searchParams.get("folioId");

    if (!folioId) {
        return NextResponse.json({ error: "folioId parameter is required" }, { status: 400 });
    }

    const summary = await getFolioWindowsSummary(folioId);
    return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.FOLIO_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const body = await req.json();

        if (body.action === "CREATE_WINDOW") {
            const { folioId, windowNumber, name, payerType, payerId } = body;
            const window = await createFolioWindow({
                folioId,
                windowNumber,
                name,
                payerType,
                payerId,
            });
            return NextResponse.json({ window }, { status: 201 });
        }

        if (body.action === "TRANSFER_CHARGE") {
            const { folioId, sourceWindowId, targetWindowId, amount, reason } = body;
            const result = await transferBetweenFolioWindows({
                folioId,
                sourceWindowId,
                targetWindowId,
                amount,
                reason,
                actorId: auth.userId,
            });
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process split folio action" },
            { status: 500 }
        );
    }
}
