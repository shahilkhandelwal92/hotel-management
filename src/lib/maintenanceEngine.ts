/**
 * Enterprise Engineering & Maintenance Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages property assets (HVAC, Elevators, Boilers, Generators),
 * preventative maintenance schedules (daily, weekly, monthly, annual),
 * and corrective work orders with SLA tracking.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateAssetParams {
    hotelId: string;
    name: string;
    assetTag: string;
    category?: string;
    location?: string;
    serialNumber?: string;
    purchaseDate?: Date | string;
    warrantyExpiry?: Date | string;
}

export interface CreateWorkOrderParams {
    hotelId: string;
    assetId?: string;
    roomId?: string;
    title: string;
    description: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | string;
    assignedToId?: string;
    createdById: string;
    lockRoomOutOfOrder?: boolean;
}

export async function createMaintenanceAsset(params: CreateAssetParams) {
    const {
        hotelId,
        name,
        assetTag,
        category = "HVAC",
        location,
        serialNumber,
        purchaseDate,
        warrantyExpiry,
    } = params;

    return prisma.maintenanceAsset.create({
        data: {
            hotelId,
            name,
            code: assetTag.toUpperCase(),
            category,
            location: location ?? "Plant Room",
            serialNumber: serialNumber ?? null,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
            status: "OPERATIONAL",
        },
    });
}

export async function createWorkOrder(params: CreateWorkOrderParams) {
    const {
        hotelId,
        assetId,
        roomId,
        title,
        description,
        priority = "MEDIUM",
        assignedToId,
        createdById,
        lockRoomOutOfOrder,
    } = params;

    const workOrderNumber = `WO-${Date.now().toString().slice(-6)}`;

    return prisma.$transaction(async (tx) => {
        const wo = await tx.workOrder.create({
            data: {
                hotelId,
                assetId: assetId ?? null,
                roomId: roomId ?? null,
                workOrderNumber,
                title,
                description,
                priority,
                category: "CORRECTIVE",
                status: "REPORTED",
                assignedTo: assignedToId ?? null,
                reportedBy: createdById,
                lockRoomOutOfOrder: Boolean(lockRoomOutOfOrder),
            },
            include: { asset: true, partsUsed: true },
        });

        if (roomId && lockRoomOutOfOrder) {
            await tx.room.update({
                where: { id: roomId },
                data: { status: "Maintenance" },
            });
        }

        return wo;
    });
}

export async function updateWorkOrderStatus(params: {
    hotelId: string;
    workOrderId: string;
    status: string;
    assignedToId?: string;
}) {
    const { workOrderId, status, assignedToId } = params;

    return prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
            status,
            ...(assignedToId ? { assignedTo: assignedToId } : {}),
            ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        },
        include: { asset: true, partsUsed: true },
    });
}

export async function addPartToWorkOrder(params: {
    hotelId: string;
    workOrderId: string;
    partName: string;
    quantity: number;
    unitCost: number | string;
}) {
    const { workOrderId, partName, quantity, unitCost } = params;
    const decUnitCost = new Prisma.Decimal(unitCost.toString());
    const decTotalCost = decUnitCost.times(quantity);

    return prisma.$transaction(async (tx) => {
        const wo = await tx.workOrder.findUnique({
            where: { id: workOrderId },
        });
        if (!wo) throw new Error("Work order not found");

        const part = await tx.workOrderPart.create({
            data: {
                workOrderId,
                partName,
                quantity,
                unitCost: decUnitCost,
                totalCost: decTotalCost,
            },
        });

        const currentActual = wo.actualCost ?? new Prisma.Decimal(0);
        await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
                actualCost: currentActual.plus(decTotalCost),
            },
        });

        return part;
    });
}

export async function completeWorkOrder(params: {
    hotelId: string;
    workOrderId: string;
    resolutionNotes?: string;
    completedById: string;
}) {
    const { workOrderId, hotelId } = params;

    return prisma.$transaction(async (tx) => {
        const wo = await tx.workOrder.findFirst({
            where: { id: workOrderId, hotelId },
        });
        if (!wo) throw new Error("Work order not found");

        const updated = await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
            include: { asset: true, partsUsed: true },
        });

        // Release Out-of-Order room to 'Dirty' for housekeeping cleaning & inspection
        if (wo.roomId && wo.lockRoomOutOfOrder) {
            await tx.room.update({
                where: { id: wo.roomId },
                data: { status: "Dirty" },
            });
        }

        return updated;
    });
}

