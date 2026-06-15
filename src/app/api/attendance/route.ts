import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const ATTENDANCE_ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "HR", "MANAGER"];

function dayBounds(value = new Date()) {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    const isAdmin = hasAccessRole(access, ATTENDANCE_ADMIN_ROLES);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "me" || !isAdmin) {
        const month = searchParams.get("month");
        const reference = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00`) : new Date();
        const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
        const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
        const { start, end } = dayBounds();

        const [today, history] = await Promise.all([
            prisma.attendance.findFirst({
                where: { userId: session.id, date: { gte: start, lte: end } },
            }),
            prisma.attendance.findMany({
                where: { userId: session.id, date: { gte: monthStart, lte: monthEnd } },
                orderBy: { date: "desc" },
            }),
        ]);
        return NextResponse.json({ today, history });
    }

    const hotelId = resolveRequestedHotel(access, searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });
    const targetDate = searchParams.get("date") ? new Date(searchParams.get("date")!) : new Date();
    const { start, end } = dayBounds(targetDate);

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { hotelId },
                { roles: { some: { hotelId } } },
            ],
        },
        include: {
            roles: { include: { role: { select: { name: true } } } },
            attendances: { where: { date: { gte: start, lte: end } }, take: 1 },
        },
        orderBy: { name: "asc" },
        take: 250,
    });

    const records = users.map((user) => {
        const attendance = user.attendances[0];
        return {
            id: user.id,
            name: user.name,
            role: user.roles[0]?.role.name || "Staff",
            checkIn: attendance?.checkIn,
            checkOut: attendance?.checkOut,
            status: attendance?.status || "Absent",
            attendanceId: attendance?.id || null,
        };
    });
    return NextResponse.json({ records, date: targetDate.toISOString() });
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    const body = await request.json();
    const isAdmin = hasAccessRole(access, ATTENDANCE_ADMIN_ROLES);
    const userId = isAdmin && body.userId ? body.userId : session.id;
    const action = body.action;
    if (!["punch_in", "punch_out", "admin_update"].includes(action)) {
        return NextResponse.json({ error: "Choose punch_in or punch_out" }, { status: 400 });
    }
    if (action === "admin_update" && !isAdmin) {
        return NextResponse.json({ error: "HR access required" }, { status: 403 });
    }

    const { start, end } = dayBounds();
    const existing = await prisma.attendance.findFirst({
        where: { userId, date: { gte: start, lte: end } },
    });
    const date = new Date(start);

    if (action === "punch_in") {
        if (existing?.checkIn) {
            return NextResponse.json({ error: "You are already punched in today" }, { status: 422 });
        }
        const record = existing
            ? await prisma.attendance.update({ where: { id: existing.id }, data: { checkIn: new Date(), status: "Present" } })
            : await prisma.attendance.create({ data: { userId, date, checkIn: new Date(), status: "Present" } });
        return NextResponse.json({ record });
    }

    if (action === "punch_out") {
        if (!existing?.checkIn) return NextResponse.json({ error: "Punch in before punching out" }, { status: 422 });
        if (existing.checkOut) return NextResponse.json({ error: "You are already punched out today" }, { status: 422 });
        const record = await prisma.attendance.update({
            where: { id: existing.id },
            data: { checkOut: new Date() },
        });
        return NextResponse.json({ record });
    }

    const record = existing
        ? await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                status: body.status || existing.status,
                checkIn: body.checkIn ? new Date(body.checkIn) : existing.checkIn,
                checkOut: body.checkOut ? new Date(body.checkOut) : existing.checkOut,
            },
        })
        : await prisma.attendance.create({
            data: {
                userId,
                date,
                status: body.status || "Present",
                checkIn: body.checkIn ? new Date(body.checkIn) : null,
                checkOut: body.checkOut ? new Date(body.checkOut) : null,
            },
        });
    return NextResponse.json({ record });
}
