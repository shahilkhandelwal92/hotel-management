import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.GUEST_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, mobile, phone, email, isSeated, company, designation } = body;

        // Verify corporate guest belongs to event at this hotel (IDOR prevention)
        const existing = await prisma.corporateGuest.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { event: { hotelId } }),
            },
            include: { event: { select: { hotelId: true, name: true } } },
        });

        if (!existing) {
            return NextResponse.json({ error: "Corporate guest not found for this property" }, { status: 404 });
        }

        const guest = await prisma.corporateGuest.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...((phone || mobile) && { phone: (phone || mobile).trim() }),
                ...(email !== undefined && { email: email?.trim() || null }),
                ...(isSeated !== undefined && { isSeated: Boolean(isSeated) }),
                ...(company !== undefined && { company: company?.trim() || null }),
                ...(designation !== undefined && { designation: designation?.trim() || null }),
            },
        });

        await logAudit({
            hotelId: existing.event.hotelId,
            userId: tenant.userId,
            module: "Events",
            action: "UPDATE",
            entityId: guest.id,
            oldValue: { name: existing.name, isSeated: existing.isSeated },
            newValue: { name: guest.name, isSeated: guest.isSeated },
            req,
        });

        return NextResponse.json({ guest });
    } catch (err) {
        console.error("PUT /api/guests/[id] error:", err);
        return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.GUEST_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const { id } = await params;

        // Verify corporate guest belongs to event at this hotel (IDOR prevention)
        const existing = await prisma.corporateGuest.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { event: { hotelId } }),
            },
            include: { event: { select: { hotelId: true } } },
        });

        if (!existing) {
            return NextResponse.json({ error: "Corporate guest not found for this property" }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.guestRequest.deleteMany({ where: { guestId: id } }),
            prisma.corporateGuest.delete({ where: { id } }),
        ]);

        await logAudit({
            hotelId: existing.event.hotelId,
            userId: tenant.userId,
            module: "Events",
            action: "DELETE",
            entityId: id,
            oldValue: { name: existing.name, email: existing.email },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/guests/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 });
    }
}
