import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    openCashierShift,
    recordCashTransactionOnShift,
    closeCashierShift,
} from "@/lib/cashierShiftEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CASHIER_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const shifts = await prisma.cashierShift.findMany({
        where: { hotelId: tenant.hotelId },
        include: { transactions: { orderBy: { createdAt: "desc" } } },
        orderBy: { openedAt: "desc" },
        take: 20,
    });

    return NextResponse.json({ shifts });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CASHIER_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "LOG_TXN") {
            const shift = await recordCashTransactionOnShift({
                shiftId: body.shiftId,
                type: body.type,
                amount: body.amount,
                description: body.description,
            });
            return NextResponse.json({ shift });
        }

        if (body.action === "CLOSE") {
            const shift = await closeCashierShift({
                shiftId: body.shiftId,
                hotelId: tenant.hotelId,
                actualClosingCash: body.actualClosingCash,
                closingNotes: body.closingNotes,
                actorId: auth.userId,
            });
            return NextResponse.json({ shift });
        }

        const shift = await openCashierShift({
            hotelId: tenant.hotelId,
            userId: auth.userId,
            terminalName: body.terminalName,
            openingFloat: body.openingFloat,
            notes: body.notes,
        });

        return NextResponse.json({ shift }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Cashier shift operation failed" },
            { status: 500 }
        );
    }
}
