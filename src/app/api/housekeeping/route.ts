import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.HOUSEKEEPING_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const roomId = searchParams.get("roomId");

    const where: Prisma.HousekeepingTaskWhereInput = {
        hotelId,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(roomId ? { roomId } : {}),
    };

    try {
        const tasks = await prisma.housekeepingTask.findMany({
            where,
            include: {
                room: { select: { id: true, number: true, type: true, floor: true, status: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
        return NextResponse.json({ tasks });
    } catch (err) {
        console.error("GET /api/housekeeping error:", err);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.HOUSEKEEPING_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { roomId, roomNumber, taskType, priority, assignedToId, notes, checklist } = body;

        if (!roomNumber && !roomId) {
            return NextResponse.json({ error: "Room number or room ID is required" }, { status: 400 });
        }

        let verifiedRoomId: string | null = null;
        let verifiedRoomNumber = roomNumber;

        if (roomId) {
            const room = await prisma.room.findFirst({
                where: { id: roomId, hotelId },
                select: { id: true, number: true },
            });
            if (!room) {
                return NextResponse.json({ error: "Room not found for this property" }, { status: 404 });
            }
            verifiedRoomId = room.id;
            verifiedRoomNumber = room.number;
        } else if (roomNumber) {
            const room = await prisma.room.findFirst({
                where: { number: String(roomNumber).trim(), hotelId },
                select: { id: true, number: true },
            });
            if (room) {
                verifiedRoomId = room.id;
            }
        }

        if (assignedToId) {
            const assignee = await prisma.user.findFirst({
                where: {
                    id: assignedToId,
                    OR: [
                        { hotelId },
                        { roles: { some: { hotelId } } },
                    ],
                },
                select: { id: true },
            });
            if (!assignee) {
                return NextResponse.json({ error: "Assigned staff member does not belong to this property" }, { status: 404 });
            }
        }

        const task = await prisma.housekeepingTask.create({
            data: {
                hotelId,
                roomId: verifiedRoomId,
                roomNumber: String(verifiedRoomNumber),
                taskType: taskType || "Clean",
                priority: priority || "Normal",
                assignedToId: assignedToId || null,
                notes: notes?.trim() || null,
                status: "Pending",
                checklist: checklist || [
                    { item: "Change bed sheets", done: false },
                    { item: "Clean bathroom", done: false },
                    { item: "Vacuum floor", done: false },
                    { item: "Replenish toiletries", done: false },
                ],
            },
            include: {
                room: { select: { id: true, number: true, type: true, floor: true, status: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "Housekeeping",
            action: "CREATE",
            entityId: task.id,
            newValue: { roomNumber: verifiedRoomNumber, taskType: task.taskType, priority: task.priority },
            req,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
        console.error("POST /api/housekeeping error:", err);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.HOUSEKEEPING_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { id, status, assignedToId, checklist, notes } = body;

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

        const existing = await prisma.housekeepingTask.findFirst({
            where: { id, hotelId },
            include: { room: true },
        });
        if (!existing) return NextResponse.json({ error: "Task not found for this property" }, { status: 404 });

        if (assignedToId) {
            const assignee = await prisma.user.findFirst({
                where: {
                    id: assignedToId,
                    OR: [
                        { hotelId },
                        { roles: { some: { hotelId } } },
                    ],
                },
                select: { id: true },
            });
            if (!assignee) {
                return NextResponse.json({ error: "Assigned staff member does not belong to this property" }, { status: 404 });
            }
        }

        const updateData: Prisma.HousekeepingTaskUpdateInput = {};
        if (status) {
            updateData.status = status;
            if (status === "Completed") updateData.completedAt = new Date();
        }
        if (assignedToId !== undefined) updateData.assignedTo = assignedToId ? { connect: { id: assignedToId } } : { disconnect: true };
        if (checklist) updateData.checklist = checklist;
        if (notes !== undefined) updateData.notes = notes;

        const task = await prisma.$transaction(async (tx) => {
            const updatedTask = await tx.housekeepingTask.update({
                where: { id },
                data: updateData,
                include: { room: true, assignedTo: { select: { id: true, name: true } } },
            });

            // If task is marked Completed, update room status accurately
            if (status === "Completed" && existing.roomId) {
                const currentRoom = await tx.room.findUnique({ where: { id: existing.roomId } });
                if (currentRoom) {
                    // Check if an active CheckedIn reservation currently occupies this room
                    const activeRes = await tx.reservation.findFirst({
                        where: {
                            roomId: currentRoom.id,
                            hotelId,
                            status: "CheckedIn",
                            deletedAt: null,
                        },
                    });

                    const nextStatus = activeRes ? "Occupied" : "Vacant";
                    await tx.room.update({
                        where: { id: currentRoom.id },
                        data: {
                            status: nextStatus,
                            lastCleaned: new Date(),
                        },
                    });
                }
            }

            return updatedTask;
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "Housekeeping",
            action: "UPDATE",
            entityId: task.id,
            oldValue: { status: existing.status, assignedToId: existing.assignedToId },
            newValue: { status: task.status, assignedToId: task.assignedToId },
            req,
        });

        return NextResponse.json({ task });
    } catch (err) {
        console.error("PUT /api/housekeeping error:", err);
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}
