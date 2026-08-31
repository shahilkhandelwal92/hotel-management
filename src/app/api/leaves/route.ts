import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const LEAVE_ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "HR", "MANAGER"];

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    const isAdmin = hasAccessRole(access, LEAVE_ADMIN_ROLES);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "me" || !isAdmin) {
        const user = await prisma.user.findUnique({ where: { id: session.id }, select: { hotelId: true } });
        const hotelId = session.hotelId || user?.hotelId;
        if (!hotelId) return NextResponse.json({ leaves: [], balances: [] });

        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const [leaves, leaveTypes] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: { userId: session.id },
                include: { leaveType: true },
                orderBy: { createdAt: "desc" },
            }),
            prisma.leaveType.findMany({ where: { hotelId }, orderBy: { name: "asc" } }),
        ]);
        const approved = leaves.filter((leave) => leave.status === "Approved" && leave.startDate >= yearStart);
        const balances = leaveTypes.map((leaveType) => {
            const used = approved
                .filter((leave) => leave.leaveTypeId === leaveType.id)
                .reduce((sum, leave) => sum + Math.floor((leave.endDate.getTime() - leave.startDate.getTime()) / 86_400_000) + 1, 0);
            const maxAllowed = leaveType.defaultDays ?? leaveType.maxDays ?? 12;
            return { ...leaveType, used, available: Math.max(0, maxAllowed - used) };
        });
        return NextResponse.json({ leaves, balances });
    }

    const hotelId = resolveRequestedHotel(access, searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });
    const requests = await prisma.leaveRequest.findMany({
        where: { user: { OR: [{ hotelId }, { roles: { some: { hotelId } } }] } },
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, name: true, hotelId: true } },
            leaveType: { select: { name: true } },
        },
        take: 250,
    });
    return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    const isAdmin = hasAccessRole(access, LEAVE_ADMIN_ROLES);
    const body = await request.json();
    const userId = isAdmin && body.userId ? body.userId : session.id;
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (!body.leaveTypeId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate || !body.reason?.trim()) {
        return NextResponse.json({ error: "Leave type, valid dates, and reason are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { hotelId: true, roles: { select: { hotelId: true } } },
    });
    const userHotelId = session.hotelId || user?.hotelId || user?.roles.find((role) => role.hotelId)?.hotelId;
    const leaveType = await prisma.leaveType.findFirst({ where: { id: body.leaveTypeId, hotelId: userHotelId || "" } });
    if (!leaveType) return NextResponse.json({ error: "Leave type is not available for this property" }, { status: 404 });

    const overlap = await prisma.leaveRequest.findFirst({
        where: {
            userId,
            status: { in: ["Pending", "Approved"] },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
        },
    });
    if (overlap) return NextResponse.json({ error: "These dates overlap an existing leave request" }, { status: 409 });

    const leave = await prisma.leaveRequest.create({
        data: {
            userId,
            leaveTypeId: leaveType.id,
            startDate,
            endDate,
            reason: body.reason.trim().slice(0, 500),
            status: "Pending",
        },
        include: { leaveType: true },
    });
    return NextResponse.json({ leave }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, LEAVE_ADMIN_ROLES)) {
        return NextResponse.json({ error: "HR access required" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.id || !["Approved", "Rejected"].includes(body.status)) {
        return NextResponse.json({ error: "Choose Approved or Rejected" }, { status: 400 });
    }
    const existing = await prisma.leaveRequest.findUnique({
        where: { id: body.id },
        include: { user: { select: { hotelId: true } } },
    });
    if (!existing || !resolveRequestedHotel(access, existing.user.hotelId)) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    const leave = await prisma.leaveRequest.update({
        where: { id: existing.id },
        data: { status: body.status },
    });
    return NextResponse.json({ leave });
}
