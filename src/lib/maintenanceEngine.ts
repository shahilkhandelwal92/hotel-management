/**
 * Enterprise Engineering & Maintenance Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages property assets (HVAC, Elevators, Boilers, Generators),
 * preventative maintenance schedules (daily, weekly, monthly, annual),
 * and corrective work orders with SLA tracking.
 */

import prisma from "@/lib/prisma";

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
    title: string;
    description: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" | string;
    assignedToId?: string;
    createdById: string;
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
        title,
        description,
        priority = "MEDIUM",
        assignedToId,
        createdById,
    } = params;

    const workOrderNumber = `WO-${Date.now().toString().slice(-6)}`;

    return prisma.workOrder.create({
        data: {
            hotelId,
            assetId: assetId ?? null,
            workOrderNumber,
            title,
            description,
            priority,
            category: "CORRECTIVE",
            status: "REPORTED",
            assignedTo: assignedToId ?? null,
            reportedBy: createdById,
        },
    });
}

export async function completeWorkOrder(params: {
    hotelId: string;
    workOrderId: string;
    resolutionNotes: string;
    completedById: string;
}) {
    const { workOrderId } = params;

    return prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
            status: "COMPLETED",
            completedAt: new Date(),
        },
    });
}
