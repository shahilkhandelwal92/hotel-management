import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");
    const status = searchParams.get("status");

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    if (status) where.status = status;

    try {
        const tasks = await prisma.housekeepingTask.findMany({
            where,
            include: {
                room: { select: { number: true, type: true, floor: true, status: true } },
                assignedTo: { select: { id: true, name: true } },
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
        return NextResponse.json({ tasks });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { hotelId, roomId, roomNumber, taskType, priority, assignedToId, notes, checklist } = body;

        const task = await prisma.housekeepingTask.create({
            data: {
                hotelId, roomId: roomId || null, roomNumber, taskType: taskType || "Clean",
                priority: priority || "Normal", assignedToId: assignedToId || null,
                notes, status: "Pending",
                checklist: checklist || [
                    { item: "Change bed sheets", done: false },
                    { item: "Clean bathroom", done: false },
                    { item: "Vacuum floor", done: false },
                    { item: "Replenish toiletries", done: false },
                ],
            },
        });
        return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, assignedToId, checklist, notes } = body;

        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === "Completed") updateData.completedAt = new Date();
        }
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
        if (checklist) updateData.checklist = checklist;
        if (notes !== undefined) updateData.notes = notes;

        const task = await prisma.housekeepingTask.update({ where: { id }, data: updateData });

        // If completed, update room status
        if (status === "Completed" && task.roomId) {
            await prisma.room.update({ where: { id: task.roomId }, data: { status: "Vacant", lastCleaned: new Date() } });
        }

        return NextResponse.json({ task });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}
