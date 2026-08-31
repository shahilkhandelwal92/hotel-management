import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createMaintenanceAsset,
    createWorkOrder,
    completeWorkOrder,
} from "@/lib/maintenanceEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.MAINTENANCE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const assets = await prisma.maintenanceAsset.findMany({
        where: { hotelId: tenant.hotelId },
        include: { workOrders: true, schedules: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.MAINTENANCE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "CREATE_WORK_ORDER") {
            const wo = await createWorkOrder({
                hotelId: tenant.hotelId,
                assetId: body.assetId,
                title: body.title,
                description: body.description,
                priority: body.priority,
                assignedToId: body.assignedToId,
                createdById: auth.userId,
            });
            return NextResponse.json({ workOrder: wo }, { status: 201 });
        }

        if (body.action === "COMPLETE_WORK_ORDER") {
            const wo = await completeWorkOrder({
                hotelId: tenant.hotelId,
                workOrderId: body.workOrderId,
                resolutionNotes: body.resolutionNotes,
                completedById: auth.userId,
            });
            return NextResponse.json({ workOrder: wo });
        }

        const asset = await createMaintenanceAsset({
            hotelId: tenant.hotelId,
            name: body.name,
            assetTag: body.assetTag,
            category: body.category,
            location: body.location,
            serialNumber: body.serialNumber,
            purchaseDate: body.purchaseDate,
            warrantyExpiry: body.warrantyExpiry,
        });

        return NextResponse.json({ asset }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Maintenance operation failed" },
            { status: 500 }
        );
    }
}
