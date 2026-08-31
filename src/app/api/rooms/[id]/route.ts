import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type Params = Promise<{ id: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_CREATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { id } = await params;
    const body = await req.json();

    try {
        const existing = await prisma.room.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Room not found for this property" }, { status: 404 });

        const priceDec = body.price !== undefined ? new Prisma.Decimal(body.price) : existing.price;

        const room = await prisma.room.update({
            where: { id },
            data: {
                ...(body.number && { number: String(body.number).trim() }),
                ...(body.type && { type: String(body.type).trim() }),
                ...(body.price !== undefined && { price: priceDec }),
                ...(body.status && { status: body.status }),
                ...(body.floor !== undefined && { floor: parseInt(String(body.floor), 10) }),
                ...(body.amenities !== undefined && { amenities: typeof body.amenities === "string" ? body.amenities : JSON.stringify(body.amenities) }),
            },
        });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Room",
            action: "UPDATE",
            entityId: room.id,
            oldValue: { number: existing.number, status: existing.status, price: existing.price.toString() },
            newValue: { number: room.number, status: room.status, price: room.price.toString() },
            req,
        });

        return NextResponse.json({ success: true, room });
    } catch (err) {
        console.error("PUT /api/rooms/[id] error:", err);
        return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_DELETE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { id } = await params;
    try {
        const existing = await prisma.room.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
            include: {
                _count: {
                    select: {
                        reservations: true,
                        roomBlocks: true,
                    },
                },
            },
        });
        if (!existing) return NextResponse.json({ error: "Room not found for this property" }, { status: 404 });

        if (existing._count.reservations > 0 || existing._count.roomBlocks > 0) {
            return NextResponse.json({
                error: "Cannot delete room with existing reservations or calendar room blocks. Mark as Out of Order instead.",
            }, { status: 422 });
        }

        await prisma.room.delete({ where: { id } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Room",
            action: "DELETE",
            entityId: id,
            oldValue: { number: existing.number, type: existing.type },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/rooms/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
    }
}
