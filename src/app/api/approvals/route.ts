import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { requestApproval, ApprovalActionType } from "@/lib/approvalEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.APPROVAL_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const requests = await prisma.approvalRequest.findMany({
        where: {
            hotelId: tenant.hotelId,
            ...(status ? { status } : {}),
        },
        include: {
            steps: { orderBy: { stepNumber: "asc" } },
            actions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.APPROVAL_REQUEST);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { actionType, entityType, entityId, requestedAmount, reason, metadata } = body;

        if (!actionType || !entityType || !entityId || !reason) {
            return NextResponse.json({ error: "Missing required approval fields" }, { status: 400 });
        }

        const result = await requestApproval({
            hotelId: tenant.hotelId,
            requesterId: auth.userId,
            actionType: actionType as ApprovalActionType,
            entityType,
            entityId,
            requestedAmount,
            reason,
            metadata,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create approval request" },
            { status: 500 }
        );
    }
}
