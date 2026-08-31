import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";

const ONLINE_MODES = ["UPI", "Card"];

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "There is no active checked-in stay to settle" }, { status: 422 });
    }

    const { paymentMode } = await request.json();
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
                    amount: 0,
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
    const onlineEnabled =
        process.env.NODE_ENV !== "production" ||
        process.env.PAYMENT_GATEWAY_MODE === "mock";
    if (!onlineEnabled) {
        return NextResponse.json({
            error: "Online payments are not configured for this property. Please pay at the front desk.",
        }, { status: 503 });
    }

    const folios = await prisma.folio.findMany({
        where: { reservationId: stay.id, status: "Open" },
        orderBy: { createdAt: "asc" },
    });
    const outstanding = Math.round(folios.reduce((sum, folio) => sum + Number(folio.balance), 0) * 100) / 100;
    if (outstanding <= 0) {
        return NextResponse.json({ error: "There is no outstanding balance" }, { status: 422 });
    }

    let remaining = outstanding;
    const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;
    await prisma.$transaction(async (tx) => {
        for (const folio of folios) {
            const bal = Number(folio.balance);
            if (remaining <= 0 || bal <= 0) continue;
            const applied = Math.min(remaining, bal);
            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Payment",
                    description: `${paymentMode} payment`,
                    amount: -applied,
                    paymentMode,
                    referenceId: reference,
                },
            });
            await tx.folio.update({
                where: { id: folio.id },
                data: { balance: { decrement: applied } },
            });
            remaining = Math.round((remaining - applied) * 100) / 100;
        }
    });

    return NextResponse.json({
        success: true,
        amount: outstanding,
        reference,
        paymentMode,
    });
}
