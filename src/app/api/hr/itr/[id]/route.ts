import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
    const auth = await requirePermission(req, PERMISSIONS.HR_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;
        const body = await req.json();
        const { documentUrl, status } = body;

        const existing = await prisma.employeeITR.findUnique({
            where: { id },
            include: { user: { select: { id: true, hotelId: true, roles: { select: { hotelId: true } } } } },
        });
        if (!existing) return NextResponse.json({ error: "ITR record not found" }, { status: 404 });

        if (!tenant.isSuperAdmin && existing.user.hotelId !== tenant.hotelId && !existing.user.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Access denied: cross-tenant record" }, { status: 403 });
        }

        const updateData: Prisma.EmployeeITRUpdateInput = {};
        if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
        if (status !== undefined) {
            updateData.status = status === "FILED" ? "FILED" : "PENDING";
            updateData.filedDate = status === "FILED" ? new Date() : null;
        }

        const itr = await prisma.employeeITR.update({
            where: { id },
            data: updateData,
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "UPDATE",
            entityId: itr.id,
            oldValue: { status: existing.status, documentUrl: existing.documentUrl },
            newValue: { status: itr.status, documentUrl: itr.documentUrl },
            req,
        });

        return NextResponse.json(itr);
    } catch (err: any) {
        console.error("PUT /api/hr/itr/[id] error:", err);
        return NextResponse.json({ error: "Failed to update ITR record" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const auth = await requirePermission(req, PERMISSIONS.HR_DELETE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;
        const existing = await prisma.employeeITR.findUnique({
            where: { id },
            include: { user: { select: { id: true, hotelId: true, roles: { select: { hotelId: true } } } } },
        });
        if (!existing) return NextResponse.json({ error: "ITR record not found" }, { status: 404 });

        if (!tenant.isSuperAdmin && existing.user.hotelId !== tenant.hotelId && !existing.user.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Access denied: cross-tenant record" }, { status: 403 });
        }

        await prisma.employeeITR.delete({ where: { id } });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "DELETE",
            entityId: id,
            oldValue: { userId: existing.userId, financialYear: existing.financialYear },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("DELETE /api/hr/itr/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete ITR record" }, { status: 500 });
    }
}
