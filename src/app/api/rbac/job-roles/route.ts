import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { createJobRole } from "@/lib/rbacHierarchy";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.JOB_ROLE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const jobRoles = await prisma.jobRole.findMany({
        where: { hotelId: tenant.hotelId },
        include: { department: true },
        orderBy: { code: "asc" },
    });

    return NextResponse.json({ jobRoles });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.JOB_ROLE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { departmentId, title, code, baseRole, approvalLimit, description } = body;

        const role = await createJobRole({
            hotelId: tenant.hotelId,
            departmentId,
            title,
            code,
            baseRole,
            approvalLimit,
            description,
        });

        return NextResponse.json({ jobRole: role }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create job role" },
            { status: 500 }
        );
    }
}
