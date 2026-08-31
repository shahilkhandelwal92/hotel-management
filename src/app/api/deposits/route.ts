import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    recordReservationDeposit,
    applyDepositToCheckIn,
    forfeitDepositOnCancellation,
    refundDeposit,
} from "@/lib/depositLifecycle";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.DEPOSIT_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get("reservationId");

    const deposits = await prisma.reservationDeposit.findMany({
        where: {
            hotelId: tenant.hotelId,
            ...(reservationId ? { reservationId } : {}),
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ deposits });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.DEPOSIT_COLLECT);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "APPLY") {
            const result = await applyDepositToCheckIn(body.depositId, body.folioId);
            return NextResponse.json({ deposit: result });
        }

        if (body.action === "FORFEIT") {
            const result = await forfeitDepositOnCancellation(body.depositId, body.cancellationFee);
            return NextResponse.json({ deposit: result });
        }

        if (body.action === "REFUND") {
            const result = await refundDeposit(body.depositId, body.refundTransactionRef);
            return NextResponse.json({ deposit: result });
        }

        const deposit = await recordReservationDeposit({
            hotelId: tenant.hotelId,
            reservationId: body.reservationId,
            amount: body.amount,
            paymentMethod: body.paymentMethod,
            transactionRef: body.transactionRef,
            notes: body.notes,
        });

        return NextResponse.json({ deposit }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Deposit operation failed" },
            { status: 500 }
        );
    }
}
