import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";

const PAYROLL_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "HR", "PAYROLL", "ACCOUNTING"];
const PAYROLL_SELF_SERVICE_ROLES = [...PAYROLL_ROLES, "STAFF", "KITCHEN", "RESTAURANT", "HOUSEKEEPING", "FRONT_DESK"];

// India PT (Professional Tax) slabs - Maharashtra as default
function calculatePT(grossSalary: number): number {
    if (grossSalary <= 7500) return 0;
    if (grossSalary <= 10000) return 175;
    return 200; // Max PT in most states
}

// PF: 12% of basic (employee contribution)
// ESI: 0.75% of gross if gross <= 21000
// TDS: Simplified slab (can be enhanced)
function calculatePayroll(data: {
    basicSalary: number; hra: number; conveyance: number; medicalAllowance: number;
    otherAllowances: number; overtime: number; bonus: number; incentives: number;
    otherDeductions: number; lopDays: number; workingDays: number;
}) {
    const lopDeduction = (data.basicSalary / data.workingDays) * data.lopDays;
    const effectiveBasic = Math.max(0, data.basicSalary - lopDeduction);

    const grossSalary = effectiveBasic + data.hra + data.conveyance +
        data.medicalAllowance + data.otherAllowances + data.overtime +
        data.bonus + data.incentives;

    const pf = Math.round(effectiveBasic * 0.12); // 12% of basic
    const esi = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0; // 0.75%
    const pt = calculatePT(grossSalary);

    // Simplified TDS (annual income * effective rate / 12)
    const annualGross = grossSalary * 12;
    let tdsAnnual = 0;
    if (annualGross > 1500000) tdsAnnual = (annualGross - 1500000) * 0.30 + 112500;
    else if (annualGross > 1200000) tdsAnnual = (annualGross - 1200000) * 0.20 + 52500;
    else if (annualGross > 1000000) tdsAnnual = (annualGross - 1000000) * 0.15 + 22500;
    else if (annualGross > 700000) tdsAnnual = (annualGross - 700000) * 0.10 + 7500;
    else if (annualGross > 300000) tdsAnnual = (annualGross - 300000) * 0.05;
    const tds = Math.round(tdsAnnual / 12);

    const totalDeductions = pf + esi + pt + tds + (data.otherDeductions || 0);
    const netSalary = Math.round(grossSalary - totalDeductions);

    return { grossSalary: Math.round(grossSalary), pf, esi, pt, tds, totalDeductions, netSalary };
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, PAYROLL_SELF_SERVICE_ROLES)) {
        return NextResponse.json({ error: "Payroll access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isPayrollAdmin = hasAccessRole(access, PAYROLL_ROLES);
    const hotelId = resolveRequestedHotel(access, isPayrollAdmin ? searchParams.get("hotelId") : access.activeHotelId);
    const month = searchParams.get("month");
    const userId = isPayrollAdmin ? searchParams.get("userId") : session.id;
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const where: Record<string, unknown> = { hotelId };
    if (month) where.month = month;
    if (userId) where.userId = userId;

    try {
        const records = await prisma.payrollRecord.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ records });
    } catch {
        return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, PAYROLL_ROLES)) {
        return NextResponse.json({ error: "Payroll access required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { hotelId: requestedHotelId, userId, month, basicSalary, hra, conveyance, medicalAllowance,
            otherAllowances, overtime, bonus, incentives, otherDeductions, lopDays, workingDays, remarks } = body;
        const hotelId = resolveRequestedHotel(access, requestedHotelId);

        if (!hotelId || !userId || !month) {
            return NextResponse.json({ error: "Valid hotelId, userId, and month are required" }, { status: 400 });
        }

        const numericFields = {
            basicSalary, hra, conveyance, medicalAllowance, otherAllowances,
            overtime, bonus, incentives, otherDeductions, lopDays,
        };
        for (const [field, value] of Object.entries(numericFields)) {
            if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
                return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 });
            }
        }

        const normalizedWorkingDays = Number(workingDays ?? 26);
        const normalizedLopDays = Number(lopDays ?? 0);
        if (!Number.isInteger(normalizedWorkingDays) || normalizedWorkingDays <= 0) {
            return NextResponse.json({ error: "workingDays must be a positive whole number" }, { status: 400 });
        }
        if (!Number.isInteger(normalizedLopDays) || normalizedLopDays > normalizedWorkingDays) {
            return NextResponse.json({ error: "lopDays cannot exceed workingDays" }, { status: 400 });
        }

        const employee = await prisma.user.findFirst({
            where: {
                id: userId,
                OR: [
                    { hotelId },
                    { roles: { some: { hotelId } } },
                ],
            },
            select: { id: true },
        });
        if (!employee) {
            return NextResponse.json({ error: "Employee not found for this hotel" }, { status: 404 });
        }

        const calcs = calculatePayroll({
            basicSalary: basicSalary || 0, hra: hra || 0, conveyance: conveyance || 0,
            medicalAllowance: medicalAllowance || 0, otherAllowances: otherAllowances || 0,
            overtime: overtime || 0, bonus: bonus || 0, incentives: incentives || 0,
            otherDeductions: otherDeductions || 0,
            lopDays: normalizedLopDays,
            workingDays: normalizedWorkingDays,
        });

        const record = await prisma.payrollRecord.upsert({
            where: { userId_month: { userId, month } },
            create: {
                hotelId, userId, month, basicSalary: basicSalary || 0,
                hra: hra || 0, conveyance: conveyance || 0, medicalAllowance: medicalAllowance || 0,
                otherAllowances: otherAllowances || 0, overtime: overtime || 0,
                bonus: bonus || 0, incentives: incentives || 0,
                grossSalary: calcs.grossSalary, pf: calcs.pf, esi: calcs.esi, pt: calcs.pt,
                tds: calcs.tds, otherDeductions: otherDeductions || 0, totalDeductions: calcs.totalDeductions,
                netSalary: calcs.netSalary, workingDays: normalizedWorkingDays, lopDays: normalizedLopDays,
                paymentStatus: "Draft", remarks,
            },
            update: {
                basicSalary: basicSalary || 0, hra: hra || 0, conveyance: conveyance || 0,
                medicalAllowance: medicalAllowance || 0, otherAllowances: otherAllowances || 0,
                overtime: overtime || 0, bonus: bonus || 0, incentives: incentives || 0,
                grossSalary: calcs.grossSalary, pf: calcs.pf, esi: calcs.esi, pt: calcs.pt,
                tds: calcs.tds, otherDeductions: otherDeductions || 0, totalDeductions: calcs.totalDeductions,
                netSalary: calcs.netSalary, workingDays: normalizedWorkingDays, lopDays: normalizedLopDays,
                paymentStatus: "Draft", remarks,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            hotelId,
            userId: session.id,
            module: "Payroll",
            action: "PAYROLL_PROCESS",
            entityId: record.id,
            newValue: { employeeId: userId, month, netSalary: record.netSalary },
            req,
        });

        return NextResponse.json({ record }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to process payroll" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, PAYROLL_ROLES)) {
        return NextResponse.json({ error: "Payroll access required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, action, paymentDate, remarks } = body;
        const existing = await prisma.payrollRecord.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });

        const hotelId = resolveRequestedHotel(access, existing.hotelId);
        if (!hotelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const updateData: {
            paymentStatus?: string;
            approvedById?: string;
            paymentDate?: Date;
            remarks?: string;
        } = {};
        if (action === "approve") {
            updateData.paymentStatus = "Approved";
            updateData.approvedById = session.id;
        } else if (action === "mark_paid") {
            if (existing.paymentStatus !== "Approved") {
                return NextResponse.json({ error: "Payroll must be approved before payment" }, { status: 422 });
            }
            updateData.paymentStatus = "Paid";
            updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
        } else if (remarks !== undefined) {
            updateData.remarks = remarks;
        } else {
            return NextResponse.json({ error: "Invalid payroll action" }, { status: 400 });
        }

        const record = await prisma.payrollRecord.update({ where: { id }, data: updateData });
        await logAudit({
            hotelId,
            userId: session.id,
            module: "Payroll",
            action: action === "approve" ? "PAYROLL_APPROVE" : "UPDATE",
            entityId: record.id,
            oldValue: { paymentStatus: existing.paymentStatus },
            newValue: { paymentStatus: record.paymentStatus },
            req,
        });
        return NextResponse.json({ record });
    } catch {
        return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
    }
}
