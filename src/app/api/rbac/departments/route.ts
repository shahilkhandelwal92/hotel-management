import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { createDepartment } from "@/lib/rbacHierarchy";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.DEPARTMENT_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const departments = await prisma.department.findMany({
        where: { hotelId: tenant.hotelId },
        include: { jobRoles: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.DEPARTMENT_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const { code, name, description } = body;

        const dept = await createDepartment({
            hotelId: tenant.hotelId,
            code,
            name,
            description,
        });

        return NextResponse.json({ department: dept }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create department" },
            { status: 500 }
        );
    }
}
