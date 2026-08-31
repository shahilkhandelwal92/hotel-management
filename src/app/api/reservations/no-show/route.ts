import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { processNoShow } from "@/lib/noShowEngine";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.RESERVATION_CANCEL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { reservationId, noShowFee, billToFolio } = body;

        const result = await processNoShow({
            hotelId: tenant.hotelId,
            reservationId,
            noShowFee,
            processedBy: auth.userId,
            billToFolio,
        });

        return NextResponse.json(result);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process no-show" },
            { status: 500 }
        );
    }
}
