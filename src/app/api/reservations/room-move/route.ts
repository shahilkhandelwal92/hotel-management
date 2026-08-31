import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { executeRoomMove } from "@/lib/roomMoveEngine";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.RESERVATION_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { reservationId, targetRoomId, reason } = body;

        const result = await executeRoomMove({
            hotelId: tenant.hotelId,
            reservationId,
            targetRoomId,
            movedBy: auth.userId,
            reason,
        });

        return NextResponse.json(result);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to execute room move" },
            { status: 500 }
        );
    }
}
