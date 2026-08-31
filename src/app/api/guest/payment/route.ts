import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const ONLINE_MODES = ["UPI", "Card"];

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "There is no active checked-in stay to settle" }, { status: 422 });
    }

    const body = await request.json();
    const { paymentMode, idempotencyKey } = body;

    if (paymentMode === "PayAtDesk") {
        const existing = await prisma.guestRequest.findFirst({
            where: {
                reservationId: stay.id,
                details: "Checkout payment at front desk",
                status: "Pending",
            },
        });
        if (!existing) {
            await prisma.guestRequest.create({
                data: {
                    reservationId: stay.id,
                    type: "Payment",
                    details: "Checkout payment at front desk",
                    status: "Pending",
                    amount: new Prisma.Decimal(0),
                },
            });
        }
        return NextResponse.json({
            success: true,
            offline: true,
            message: "Reception has been notified. Pay at the desk to complete checkout.",
        });
    }

    if (!ONLINE_MODES.includes(paymentMode)) {
        return NextResponse.json({ error: "Choose UPI, Card, or Pay at front desk" }, { status: 400 });
    }

    // Production safety: Never pretend mock payments are real payments in production
    const isProduction = process.env.NODE_ENV === "production";
    const gatewayMode = process.env.PAYMENT_GATEWAY_MODE;
    const realGatewayConfigured = process.env.RAZORPAY_KEY_ID || process.env.STRIPE_SECRET_KEY;

    if (isProduction && (!realGatewayConfigured || gatewayMode === "mock")) {
        return NextResponse.json({
            error: "Online payment gateway is not live for this property. Please settle your bill at the front desk.",
            code: "GATEWAY_UNCONFIGURED_PRODUCTION",
        }, { status: 503 });
    }

    // Folios calculation with Decimal
    const folios = await prisma.folio.findMany({
        where: { reservationId: stay.id, hotelId: stay.hotelId, status: "Open" },
        orderBy: { createdAt: "asc" },
    });

    let totalOutstanding = new Prisma.Decimal(0);
    folios.forEach((f) => {
        totalOutstanding = totalOutstanding.plus(new Prisma.Decimal(f.balance));
    });

    if (totalOutstanding.lessThanOrEqualTo(0)) {
        return NextResponse.json({ error: "There is no outstanding balance" }, { status: 422 });
    }

    const reference = idempotencyKey
        ? `PAY-${idempotencyKey.trim().toUpperCase()}`
        : `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Idempotency check: check if transaction with this reference has already been executed
    const existingPayment = await prisma.folioTransaction.findFirst({
        where: { referenceId: reference, type: "Payment" },
    });
    if (existingPayment) {
        return NextResponse.json({
            success: true,
            amount: totalOutstanding.toNumber(),
            reference,
            paymentMode,
            idempotentReplay: true,
        });
    }

    let remainingToSettle = totalOutstanding;

    await prisma.$transaction(async (tx) => {
        // Re-check idempotency inside atomic transaction boundary
        const existingTx = await tx.folioTransaction.findFirst({
            where: { referenceId: reference, type: "Payment" },
        });
        if (existingTx) {
            return;
        }

        const currentFolios = await tx.folio.findMany({
            where: { reservationId: stay.id, hotelId: stay.hotelId, status: "Open" },
            orderBy: { createdAt: "asc" },
        });

        for (const folio of currentFolios) {
            const bal = new Prisma.Decimal(folio.balance);
            if (remainingToSettle.lessThanOrEqualTo(0) || bal.lessThanOrEqualTo(0)) continue;

            const applied = remainingToSettle.lessThan(bal) ? remainingToSettle : bal;

            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Payment",
                    description: `${paymentMode} Payment (Guest Portal)`,
                    amount: applied.negated(),
                    paymentMode,
                    referenceId: reference,
                },
            });

            await tx.folio.update({
                where: { id: folio.id },
                data: { balance: { decrement: applied } },
            });

            remainingToSettle = remainingToSettle.minus(applied);
        }
    });

    await logAudit({
        hotelId: stay.hotelId,
        module: "Payment",
        action: "CREATE",
        entityId: stay.id,
        newValue: { reference, paymentMode, amount: totalOutstanding.toString() },
        req: request,
    });

    return NextResponse.json({
        success: true,
        amount: totalOutstanding.toNumber(),
        reference,
        paymentMode,
    });
}
