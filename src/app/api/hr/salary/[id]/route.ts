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
        const { basicSalary, allowances, deductions, paymentStatus } = body;

        const existing = await prisma.employeeSalary.findUnique({
            where: { id },
            include: { user: { select: { id: true, hotelId: true, roles: { select: { hotelId: true } } } } },
        });
        if (!existing) return NextResponse.json({ error: "Salary record not found" }, { status: 404 });

        if (!tenant.isSuperAdmin && existing.user.hotelId !== tenant.hotelId && !existing.user.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Access denied: cross-tenant record" }, { status: 403 });
        }

        const basicDec = basicSalary !== undefined ? new Prisma.Decimal(basicSalary) : existing.basicSalary;
        const allowDec = allowances !== undefined ? new Prisma.Decimal(allowances) : existing.allowances;
        const deducDec = deductions !== undefined ? new Prisma.Decimal(deductions) : existing.deductions;

        if (basicDec.isNegative() || allowDec.isNegative() || deducDec.isNegative()) {
            return NextResponse.json({ error: "Salary components cannot be negative" }, { status: 400 });
        }

        const netDec = basicDec.plus(allowDec).minus(deducDec);

        const updateData: Prisma.EmployeeSalaryUpdateInput = {
            basicSalary: basicDec,
            allowances: allowDec,
            deductions: deducDec,
            netSalary: netDec,
        };

        if (paymentStatus !== undefined) {
            updateData.paymentStatus = paymentStatus === "PAID" ? "PAID" : "UNPAID";
            updateData.paymentDate = paymentStatus === "PAID" ? new Date() : null;
        }

        const salary = await prisma.employeeSalary.update({
            where: { id },
            data: updateData,
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "UPDATE",
            entityId: salary.id,
            oldValue: { netSalary: existing.netSalary.toString(), paymentStatus: existing.paymentStatus },
            newValue: { netSalary: netDec.toString(), paymentStatus: salary.paymentStatus },
            req,
        });

        return NextResponse.json(salary);
    } catch (err: any) {
        console.error("PUT /api/hr/salary/[id] error:", err);
        return NextResponse.json({ error: "Failed to update salary record" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const auth = await requirePermission(req, PERMISSIONS.HR_DELETE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;
        const existing = await prisma.employeeSalary.findUnique({
            where: { id },
            include: { user: { select: { id: true, hotelId: true, roles: { select: { hotelId: true } } } } },
        });
        if (!existing) return NextResponse.json({ error: "Salary record not found" }, { status: 404 });

        if (!tenant.isSuperAdmin && existing.user.hotelId !== tenant.hotelId && !existing.user.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Access denied: cross-tenant record" }, { status: 403 });
        }

        await prisma.employeeSalary.delete({ where: { id } });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "DELETE",
            entityId: id,
            oldValue: { userId: existing.userId, month: existing.month, netSalary: existing.netSalary.toString() },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("DELETE /api/hr/salary/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete salary record" }, { status: 500 });
    }
}
