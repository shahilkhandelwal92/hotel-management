import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    const month = searchParams.get("month");

    // Staff viewing their own salary
    if (targetUserId && targetUserId === tenant.userId) {
        const salaries = await prisma.employeeSalary.findMany({
            where: {
                userId: tenant.userId,
                ...(month ? { month } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, hotelId: true } } },
            orderBy: [{ month: "desc" }],
        });
        return NextResponse.json(salaries);
    }

    // Viewing other employees' salaries requires HR_VIEW or PAYROLL_VIEW
    const auth = await requirePermission(req, PERMISSIONS.HR_VIEW);
    if (auth instanceof NextResponse) return auth;

    const hotelId = tenant.hotelId;
    const where: Prisma.EmployeeSalaryWhereInput = {};

    if (targetUserId) {
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, hotelId: true, roles: { select: { hotelId: true } } },
        });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (!tenant.isSuperAdmin && targetUser.hotelId !== hotelId && !targetUser.roles.some((r) => r.hotelId === hotelId)) {
            return NextResponse.json({ error: "Access denied: cross-tenant user" }, { status: 403 });
        }
        where.userId = targetUserId;
    } else if (hotelId && !tenant.isSuperAdmin) {
        where.user = {
            OR: [
                { hotelId },
                { roles: { some: { hotelId } } },
            ],
        };
    }

    if (month) where.month = month;

    try {
        const salaries = await prisma.employeeSalary.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, hotelId: true } } },
            orderBy: [{ month: "desc" }],
        });
        return NextResponse.json(salaries);
    } catch (err: any) {
        console.error("GET /api/hr/salary error:", err);
        return NextResponse.json({ error: "Failed to fetch salaries" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.HR_CREATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const body = await req.json();
        const { userId, month, basicSalary, allowances, deductions, paymentStatus } = body;

        if (!userId || !month) {
            return NextResponse.json({ error: "userId and month are required" }, { status: 400 });
        }

        // Verify target employee belongs to authorized hotel
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, hotelId: true, roles: { select: { hotelId: true } } },
        });
        if (!targetUser) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }
        if (!tenant.isSuperAdmin && targetUser.hotelId !== tenant.hotelId && !targetUser.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Cannot create salary for employee of another property" }, { status: 403 });
        }

        const basicDec = new Prisma.Decimal(basicSalary ?? 0);
        const allowDec = new Prisma.Decimal(allowances ?? 0);
        const deducDec = new Prisma.Decimal(deductions ?? 0);

        if (basicDec.isNegative() || allowDec.isNegative() || deducDec.isNegative()) {
            return NextResponse.json({ error: "Salary components cannot be negative" }, { status: 400 });
        }

        const netDec = basicDec.plus(allowDec).minus(deducDec);

        const status = paymentStatus === "PAID" ? "PAID" : "UNPAID";
        const salary = await prisma.employeeSalary.create({
            data: {
                userId,
                month,
                basicSalary: basicDec,
                allowances: allowDec,
                deductions: deducDec,
                netSalary: netDec,
                paymentStatus: status,
                paymentDate: status === "PAID" ? new Date() : null,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "CREATE",
            entityId: salary.id,
            newValue: { userId, month, netSalary: netDec.toString(), paymentStatus: status },
            req,
        });

        return NextResponse.json(salary, { status: 201 });
    } catch (err: any) {
        if (err.code === "P2002") {
            return NextResponse.json({ error: "Salary record already exists for this employee and month" }, { status: 409 });
        }
        console.error("POST /api/hr/salary error:", err);
        return NextResponse.json({ error: "Failed to create salary record" }, { status: 500 });
    }
}
