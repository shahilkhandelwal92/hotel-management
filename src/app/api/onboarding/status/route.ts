import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const STEPS = [
    { key: "hotel_details", label: "Hotel Profile", desc: "Name, contact, address, GSTIN" },
    { key: "rooms_added", label: "Rooms Configured", desc: "At least 1 room type added" },
    { key: "tax_configured", label: "Tax Configuration", desc: "GST slabs set for your property" },
    { key: "staff_invited", label: "Staff Invited", desc: "At least 1 staff member" },
    { key: "night_audit_done", label: "First Night Audit", desc: "Trial day-close completed" },
    { key: "pos_configured", label: "POS Ready", desc: "Menu items and stock set up" },
    { key: "first_reservation", label: "First Reservation", desc: "Test booking created" },
];

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const [
        hotel,
        roomCount,
        taxConfig,
        staffCount,
        nightAuditCount,
        menuItemCount,
        reservationCount,
    ] = await Promise.all([
        prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true, name: true, gstin: true, phone: true } }),
        prisma.room.count({ where: { hotelId } }),
        prisma.taxConfiguration.findFirst({ where: { hotelId } }),
        prisma.user.count({ where: { hotelId, id: { not: auth.userId } } }),
        prisma.nightAudit.count({ where: { hotelId } }),
        prisma.menuItem.count({ where: { hotelId } }),
        prisma.reservation.count({ where: { hotelId, deletedAt: null } }),
    ]);

    const checks: Record<string, boolean> = {
        hotel_details: !!(hotel?.name && hotel?.gstin && hotel?.phone),
        rooms_added: roomCount > 0,
        tax_configured: !!taxConfig,
        staff_invited: staffCount > 0,
        night_audit_done: nightAuditCount > 0,
        pos_configured: menuItemCount > 0,
        first_reservation: reservationCount > 0,
    };

    const completedCount = Object.values(checks).filter(Boolean).length;
    const percentage = Math.round((completedCount / STEPS.length) * 100);

    const steps = STEPS.map((s) => ({ ...s, completed: checks[s.key] ?? false }));

    return NextResponse.json({
        hotelId,
        percentage,
        completedCount,
        totalSteps: STEPS.length,
        isComplete: percentage === 100,
        steps,
        nextStep: steps.find((s) => !s.completed) ?? null,
    });
}
