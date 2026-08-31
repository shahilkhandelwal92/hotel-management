import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { updateHotelTaskStatus, addHotelTaskComment, TaskStatus } from "@/lib/taskEngine";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requirePermission(req, PERMISSIONS.TASK_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { id } = await context.params;

    try {
        const body = await req.json();
        const { status, reason } = body;

        if (!status) {
            return NextResponse.json({ error: "Missing status" }, { status: 400 });
        }

        const task = await updateHotelTaskStatus({
            hotelId: tenant.hotelId,
            taskId: id,
            toStatus: status as TaskStatus,
            changedBy: auth.userId,
            reason,
        });

        return NextResponse.json({ task });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to update task status" },
            { status: 400 }
        );
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requirePermission(req, PERMISSIONS.TASK_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { id } = await context.params;

    try {
        const body = await req.json();
        const { comment } = body;

        if (!comment) {
            return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
        }

        const taskComment = await addHotelTaskComment({
            hotelId: tenant.hotelId,
            taskId: id,
            userId: auth.userId,
            comment,
        });

        return NextResponse.json({ comment: taskComment }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to add comment" },
            { status: 400 }
        );
    }
}
