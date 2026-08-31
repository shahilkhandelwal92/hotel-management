import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { id } = await params;

    try {
        const existing = await prisma.amenityBooking.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Booking not found for this property" }, { status: 404 });

        await prisma.amenityBooking.delete({ where: { id } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Amenity",
            action: "DELETE",
            entityId: id,
            oldValue: { guestName: existing.guestName, totalAmount: existing.totalAmount.toString() },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Delete booking error:", err);
        return NextResponse.json({ error: "Failed to delete amenity booking" }, { status: 500 });
    }
}
