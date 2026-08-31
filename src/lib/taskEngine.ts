/**
 * Centralized Enterprise Task & Trace Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages operational tasks across Guest Requests, Maintenance,
 * VIP Arrivals, Airport Pickups, Wake-Up Calls, Housekeeping Inspections,
 * and AR Collections.
 */

import prisma from "@/lib/prisma";

export type TaskCategory =
    | "GUEST_REQUEST"
    | "MAINTENANCE"
    | "VIP_ARRIVAL"
    | "AIRPORT_PICKUP"
    | "WAKE_UP_CALL"
    | "LATE_CHECKOUT"
    | "INSPECTION"
    | "AR_COLLECTION"
    | "GENERAL";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ESCALATED";

export interface CreateTaskParams {
    hotelId: string;
    category: TaskCategory;
    priority?: TaskPriority;
    title: string;
    description?: string;
    dueDate?: Date | string | null;
    roomId?: string | null;
    guestId?: string | null;
    reservationId?: string | null;
    assignedTo?: string | null;
    createdBy: string;
}

export interface UpdateTaskStatusParams {
    hotelId: string;
    taskId: string;
    toStatus: TaskStatus;
    changedBy: string;
    reason?: string;
}

export async function createHotelTask(params: CreateTaskParams) {
    const {
        hotelId,
        category,
        priority = "MEDIUM",
        title,
        description,
        dueDate,
        roomId,
        guestId,
        reservationId,
        assignedTo,
        createdBy,
    } = params;

    const task = await prisma.hotelTask.create({
        data: {
            hotelId,
            category,
            priority,
            title,
            description: description ?? null,
            dueDate: dueDate ? new Date(dueDate) : null,
            roomId: roomId ?? null,
            guestId: guestId ?? null,
            reservationId: reservationId ?? null,
            assignedTo: assignedTo ?? null,
            createdBy,
            status: "PENDING",
            statusHistory: {
                create: {
                    fromStatus: "NONE",
                    toStatus: "PENDING",
                    changedBy: createdBy,
                    reason: "Task created",
                },
            },
        },
        include: {
            statusHistory: true,
            comments: true,
        },
    });

    return task;
}

export async function updateHotelTaskStatus(params: UpdateTaskStatusParams) {
    const { hotelId, taskId, toStatus, changedBy, reason } = params;

    const existingTask = await prisma.hotelTask.findFirst({
        where: { id: taskId, hotelId },
        include: { statusHistory: true, comments: true },
    });

    if (!existingTask) {
        throw new Error("Hotel task not found");
    }

    if (existingTask.status === toStatus) {
        return existingTask;
    }

    const updated = await prisma.$transaction(async (tx) => {
        await tx.taskStatusHistory.create({
            data: {
                taskId,
                fromStatus: existingTask.status,
                toStatus,
                changedBy,
                reason: reason ?? null,
            },
        });

        return tx.hotelTask.update({
            where: { id: taskId },
            data: {
                status: toStatus,
                completedAt: toStatus === "COMPLETED" ? new Date() : null,
            },
            include: {
                statusHistory: true,
                comments: true,
            },
        });
    });

    return updated;
}

export async function addHotelTaskComment(params: { hotelId: string; taskId: string; userId: string; comment: string }) {
    const { hotelId, taskId, userId, comment } = params;

    const task = await prisma.hotelTask.findFirst({
        where: { id: taskId, hotelId },
    });

    if (!task) {
        throw new Error("Hotel task not found");
    }

    return prisma.taskComment.create({
        data: {
            taskId,
            userId,
            comment,
        },
    });
}
