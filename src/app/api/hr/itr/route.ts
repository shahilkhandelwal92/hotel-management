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
    const financialYear = searchParams.get("financialYear");

    // Staff viewing their own ITR
    if (targetUserId && targetUserId === tenant.userId) {
        const itrs = await prisma.employeeITR.findMany({
            where: {
                userId: tenant.userId,
                ...(financialYear ? { financialYear } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, hotelId: true } } },
            orderBy: [{ financialYear: "desc" }],
        });
        return NextResponse.json(itrs);
    }

    // Viewing other employees' ITRs requires HR_VIEW or PAYROLL_VIEW
    const auth = await requirePermission(req, PERMISSIONS.HR_VIEW);
    if (auth instanceof NextResponse) return auth;

    const hotelId = tenant.hotelId;
    const where: Prisma.EmployeeITRWhereInput = {};

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

    if (financialYear) where.financialYear = financialYear;

    try {
        const itrs = await prisma.employeeITR.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, hotelId: true } } },
            orderBy: [{ financialYear: "desc" }],
        });
        return NextResponse.json(itrs);
    } catch (err: any) {
        console.error("GET /api/hr/itr error:", err);
        return NextResponse.json({ error: "Failed to fetch ITR records" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.HR_CREATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const body = await req.json();
        const { userId, financialYear, documentUrl, status } = body;

        if (!userId || !financialYear) {
            return NextResponse.json({ error: "userId and financialYear are required" }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, hotelId: true, roles: { select: { hotelId: true } } },
        });
        if (!targetUser) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }
        if (!tenant.isSuperAdmin && targetUser.hotelId !== tenant.hotelId && !targetUser.roles.some((r) => r.hotelId === tenant.hotelId)) {
            return NextResponse.json({ error: "Cannot create ITR for employee of another property" }, { status: 403 });
        }

        const itrStatus = status === "FILED" ? "FILED" : "PENDING";
        const itr = await prisma.employeeITR.create({
            data: {
                userId,
                financialYear,
                documentUrl: documentUrl || null,
                status: itrStatus,
                filedDate: itrStatus === "FILED" ? new Date() : null,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            hotelId: tenant.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "CREATE",
            entityId: itr.id,
            newValue: { userId, financialYear, status: itrStatus },
            req,
        });

        return NextResponse.json(itr, { status: 201 });
    } catch (err: any) {
        if (err.code === "P2002") {
            return NextResponse.json({ error: "ITR record already exists for this employee and financial year" }, { status: 409 });
        }
        console.error("POST /api/hr/itr error:", err);
        return NextResponse.json({ error: "Failed to create ITR record" }, { status: 500 });
    }
}
