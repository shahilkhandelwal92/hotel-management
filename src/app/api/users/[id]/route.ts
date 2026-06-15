import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { getRequestAccess, hasAccessRole } from "@/lib/apiAccess";
import type { Prisma } from "@prisma/client";

type Params = Promise<{ id: string }>;
const USER_ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "HR"];
const GLOBAL_ROLES = ["SUPER_ADMIN", "OWNER"];
const HOTEL_ADMIN_ASSIGNABLE = ["STAFF", "KITCHEN", "RESTAURANT", "HOUSEKEEPING", "FRONT_DESK"];

export async function PUT(request: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, USER_ADMIN_ROLES)) {
        return NextResponse.json({ error: "Staff administration access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
    });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!access.isSuperAdmin) {
        if (existing.roles.some((assignment) => GLOBAL_ROLES.includes(assignment.role.name))) {
            return NextResponse.json({ error: "Only a super admin can edit global administrators" }, { status: 403 });
        }
        if (!access.activeHotelId || !existing.roles.some((assignment) => assignment.hotelId === access.activeHotelId)) {
            return NextResponse.json({ error: "User is outside your active property" }, { status: 403 });
        }
    }

    const body = await request.json() as Record<string, unknown>;
    const roleNames: string[] | null = Array.isArray(body.roles)
        ? Array.from(new Set((body.roles as unknown[]).filter((role): role is string => typeof role === "string")))
        : null;
    const requestedHotelIds: string[] = Array.isArray(body.hotelIds)
        ? (body.hotelIds as unknown[]).filter((hotelId): hotelId is string => typeof hotelId === "string")
        : typeof body.hotelId === "string" ? [body.hotelId] : [];
    if (roleNames && roleNames.length === 0) return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
    if (!access.isSuperAdmin && roleNames?.some((role) => !HOTEL_ADMIN_ASSIGNABLE.includes(role))) {
        return NextResponse.json({ error: "Hotel admins can assign operational staff roles only" }, { status: 403 });
    }

    const hotelIds: string[] = access.isSuperAdmin
        ? Array.from(new Set(requestedHotelIds))
        : access.activeHotelId ? [access.activeHotelId] : [];
    const roles = roleNames ? await prisma.role.findMany({ where: { name: { in: roleNames } } }) : [];
    const hotels = hotelIds.length
        ? await prisma.hotel.findMany({ where: { id: { in: hotelIds }, status: "Active" }, select: { id: true } })
        : [];
    if (roleNames && roles.length !== roleNames.length) return NextResponse.json({ error: "One or more roles are invalid" }, { status: 400 });
    if (hotels.length !== hotelIds.length) return NextResponse.json({ error: "One or more properties are invalid" }, { status: 400 });
    if (roleNames?.some((role) => !GLOBAL_ROLES.includes(role)) && hotelIds.length === 0) {
        return NextResponse.json({ error: "Select a property for hotel roles" }, { status: 400 });
    }

    const updateData: Prisma.UserUpdateInput = {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
        email: typeof body.email === "string" && body.email.includes("@") ? body.email.trim().toLowerCase() : undefined,
        hotel: hotelIds[0]
            ? { connect: { id: hotelIds[0] } }
            : roleNames ? { disconnect: true } : undefined,
    };
    if (typeof body.password === "string" && body.password) {
        if (body.password.length < 8) return NextResponse.json({ error: "Password must contain at least 8 characters" }, { status: 400 });
        updateData.password = await hashPassword(body.password);
    }

    const assignments: Array<{ roleId: string; hotelId: string | null }> = [];
    for (const role of roles) {
        if (GLOBAL_ROLES.includes(role.name)) {
            assignments.push({ roleId: role.id, hotelId: null });
            continue;
        }

        for (const hotelId of hotelIds) {
            assignments.push({ roleId: role.id, hotelId });
        }
    }

    const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id }, data: updateData });
        if (roleNames) {
            await tx.userRole.deleteMany({ where: { userId: id } });
            await tx.userRole.createMany({
                data: assignments.map((assignment) => ({ ...assignment, userId: id })),
            });
        }
        await tx.auditLog.create({
            data: {
                hotelId: hotelIds[0] || existing.hotelId,
                userId: session.id,
                module: "User",
                action: "UPDATE",
                entityType: "User",
                entityId: id,
                newValue: { email: user.email, roleNames, hotelIds },
                ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
        });
        return user;
    });
    return NextResponse.json({ user: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, USER_ADMIN_ROLES)) {
        return NextResponse.json({ error: "Staff administration access required" }, { status: 403 });
    }
    const { id } = await params;
    if (id === session.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 422 });

    const target = await prisma.user.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const privileged = target.roles.some((assignment) => GLOBAL_ROLES.includes(assignment.role.name));
    if (privileged && !access.isSuperAdmin) {
        return NextResponse.json({ error: "Only a super admin can remove global administrators" }, { status: 403 });
    }
    if (!access.isSuperAdmin && (!access.activeHotelId || !target.roles.some((assignment) => assignment.hotelId === access.activeHotelId))) {
        return NextResponse.json({ error: "User is outside your active property" }, { status: 403 });
    }
    if (privileged) {
        const remaining = await prisma.user.count({
            where: {
                id: { not: id },
                roles: { some: { role: { name: { in: GLOBAL_ROLES } } } },
            },
        });
        if (remaining === 0) return NextResponse.json({ error: "Cannot delete the last global administrator" }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
        await tx.auditLog.create({
            data: {
                hotelId: target.hotelId,
                userId: session.id,
                module: "User",
                action: "DELETE",
                entityType: "User",
                entityId: id,
                oldValue: { email: target.email },
                ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
        });
    });
    return NextResponse.json({ success: true });
}
