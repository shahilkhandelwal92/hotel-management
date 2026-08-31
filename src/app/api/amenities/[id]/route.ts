import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type Params = Promise<{ id: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { id } = await params;
    const body = await req.json();

    try {
        const existing = await prisma.amenity.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Amenity not found for this property" }, { status: 404 });

        const priceDec = body.price !== undefined ? new Prisma.Decimal(body.price || 0) : existing.price;

        const amenity = await prisma.amenity.update({
            where: { id },
            data: {
                ...(body.name && { name: body.name.trim() }),
                ...(body.price !== undefined && { price: priceDec }),
                ...(body.pricingType && { pricingType: body.pricingType }),
                ...(body.capacity !== undefined && { capacity: parseInt(String(body.capacity || "1"), 10) }),
                ...(body.customSlots !== undefined && { customSlots: body.customSlots }),
                ...(body.isTaxApplicable !== undefined && { isTaxApplicable: Boolean(body.isTaxApplicable) }),
                ...(body.status && { status: body.status }),
            },
        });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Amenity",
            action: "UPDATE",
            entityId: amenity.id,
            oldValue: { name: existing.name, price: existing.price.toString() },
            newValue: { name: amenity.name, price: amenity.price.toString() },
            req,
        });

        return NextResponse.json({ success: true, amenity });
    } catch (err) {
        console.error("PUT /api/amenities/[id] error:", err);
        return NextResponse.json({ error: "Failed to update amenity" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { id } = await params;
    try {
        const existing = await prisma.amenity.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Amenity not found for this property" }, { status: 404 });

        const bookingCount = await prisma.amenityBooking.count({ where: { amenityId: id } });
        if (bookingCount > 0) {
            return NextResponse.json({ error: "Cannot delete amenity with existing bookings" }, { status: 400 });
        }

        await prisma.amenity.delete({ where: { id } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Amenity",
            action: "DELETE",
            entityId: id,
            oldValue: { name: existing.name },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/amenities/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete amenity" }, { status: 500 });
    }
}
