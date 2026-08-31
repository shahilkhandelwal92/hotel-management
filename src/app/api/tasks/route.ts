import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { createHotelTask, TaskCategory, TaskPriority } from "@/lib/taskEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.TASK_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const assignedTo = searchParams.get("assignedTo");

    const tasks = await prisma.hotelTask.findMany({
        where: {
            hotelId: tenant.hotelId,
            ...(status ? { status } : {}),
            ...(category ? { category } : {}),
            ...(assignedTo ? { assignedTo } : {}),
        },
        include: {
            statusHistory: { orderBy: { createdAt: "desc" } },
            comments: { orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.TASK_CREATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { category, priority, title, description, dueDate, roomId, guestId, reservationId, assignedTo } = body;

        if (!category || !title) {
            return NextResponse.json({ error: "Missing task category or title" }, { status: 400 });
        }

        const task = await createHotelTask({
            hotelId: tenant.hotelId,
            category: category as TaskCategory,
            priority: (priority as TaskPriority) ?? "MEDIUM",
            title,
            description,
            dueDate,
            roomId,
            guestId,
            reservationId,
            assignedTo,
            createdBy: auth.userId,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create task" },
            { status: 500 }
        );
    }
}
