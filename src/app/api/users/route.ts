import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const USER_ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "HR"];
const GLOBAL_ROLES = ["SUPER_ADMIN", "OWNER"];
const HOTEL_ADMIN_ASSIGNABLE = ["STAFF", "KITCHEN", "RESTAURANT", "HOUSEKEEPING", "FRONT_DESK"];

function formatUser(user: {
    id: string;
    name: string;
    email: string;
    hotelId: string | null;
    roles: { hotelId: string | null; role: { name: string }; hotel: { id: string; name: string } | null }[];
}) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        hotelId: user.hotelId,
        roles: [...new Set(user.roles.map((assignment) => assignment.role.name))],
        hotelIds: [...new Set(user.roles.map((assignment) => assignment.hotelId).filter((id): id is string => Boolean(id)))],
        assignments: user.roles.map((assignment) => ({
            role: assignment.role.name,
            hotelId: assignment.hotelId,
            hotelName: assignment.hotel?.name || "All properties",
        })),
    };
}

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, USER_ADMIN_ROLES)) {
        return NextResponse.json({ error: "Staff administration access required" }, { status: 403 });
    }

    const requestedHotelId = new URL(request.url).searchParams.get("hotelId");
    const hotelId = requestedHotelId ? resolveRequestedHotel(access, requestedHotelId) : access.activeHotelId;
    const users = await prisma.user.findMany({
        where: access.isSuperAdmin && !requestedHotelId
            ? undefined
            : hotelId
                ? { OR: [{ hotelId }, { roles: { some: { hotelId } } }] }
                : { id: "__none__" },
        include: {
            roles: {
                include: {
                    role: { select: { name: true } },
                    hotel: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { name: "asc" },
        take: 500,
    });

    const visible = access.isSuperAdmin
        ? users
        : users.filter((user) => !user.roles.some((assignment) => GLOBAL_ROLES.includes(assignment.role.name)));
    return NextResponse.json({ users: visible.map(formatUser) });
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, USER_ADMIN_ROLES)) {
        return NextResponse.json({ error: "Staff administration access required" }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const roleNames: string[] = Array.isArray(body.roles)
        ? Array.from(new Set((body.roles as unknown[]).filter((role): role is string => typeof role === "string")))
        : [];
    const requestedHotelIds: string[] = Array.isArray(body.hotelIds)
        ? (body.hotelIds as unknown[]).filter((id): id is string => typeof id === "string")
        : typeof body.hotelId === "string" ? [body.hotelId] : [];

    if (!name || !email.includes("@") || password.length < 8 || roleNames.length === 0) {
        return NextResponse.json({ error: "Valid name, email, password, and at least one role are required" }, { status: 400 });
    }
    if (!access.isSuperAdmin && roleNames.some((role) => !HOTEL_ADMIN_ASSIGNABLE.includes(role))) {
        return NextResponse.json({ error: "Hotel admins can assign operational staff roles only" }, { status: 403 });
    }

    const hotelIds: string[] = access.isSuperAdmin
        ? Array.from(new Set(requestedHotelIds))
        : access.activeHotelId ? [access.activeHotelId] : [];
    const requiresHotel = roleNames.some((role) => !GLOBAL_ROLES.includes(role));
    if (requiresHotel && hotelIds.length === 0) {
        return NextResponse.json({ error: "Select at least one property for hotel roles" }, { status: 400 });
    }

    const [roles, hotels, existingEmail] = await Promise.all([
        prisma.role.findMany({ where: { name: { in: roleNames } } }),
        prisma.hotel.findMany({ where: { id: { in: hotelIds }, status: "Active" }, select: { id: true } }),
        prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (existingEmail) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    if (roles.length !== roleNames.length || hotels.length !== hotelIds.length) {
        return NextResponse.json({ error: "One or more roles or properties are invalid" }, { status: 400 });
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
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: {
                name,
                email,
                password: passwordHash,
                hotelId: hotelIds[0] || null,
                roles: {
                    create: assignments.map((assignment) => ({
                        role: { connect: { id: assignment.roleId } },
                        ...(assignment.hotelId
                            ? { hotel: { connect: { id: assignment.hotelId } } }
                            : {}),
                    })),
                },
            },
            include: {
                roles: {
                    include: {
                        role: { select: { name: true } },
                        hotel: { select: { id: true, name: true } },
                    },
                },
            },
        });
        await tx.auditLog.create({
            data: {
                hotelId: hotelIds[0] || null,
                userId: session.id,
                module: "User",
                action: "CREATE",
                entityType: "User",
                entityId: created.id,
                newValue: { email, roleNames, hotelIds },
                ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
        });
        return created;
    });

    return NextResponse.json({ user: formatUser(user) }, { status: 201 });
}
