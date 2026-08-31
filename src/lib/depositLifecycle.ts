/**
 * Enterprise Reservation Deposit & Prepayment Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages advance deposits, payment capture, check-in credit applications,
 * cancellation fee forfeitures, and refunds.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RecordDepositParams {
    hotelId: string;
    reservationId: string;
    amount: Prisma.Decimal | number | string;
    paymentMethod: string;
    currency?: string;
    transactionRef?: string;
    notes?: string;
}

export async function recordReservationDeposit(params: RecordDepositParams) {
    const { hotelId, reservationId, amount, paymentMethod, currency = "INR", transactionRef, notes } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        // 1. Create deposit record
        const deposit = await tx.reservationDeposit.create({
            data: {
                hotelId,
                reservationId,
                amount: decAmount,
                currency,
                paymentMethod,
                status: "RECEIVED",
                transactionRef: transactionRef ?? null,
                paidAt: new Date(),
                notes: notes ?? null,
            },
        });

        // 2. Update reservation advance deposit and balance due
        await tx.reservation.update({
            where: { id: reservationId },
            data: {
                advanceDeposit: { increment: decAmount },
                balanceDue: { decrement: decAmount },
            },
        });

        return deposit;
    });
}

export async function applyDepositToCheckIn(depositId: string, folioId: string) {
    return prisma.$transaction(async (tx) => {
        const deposit = await tx.reservationDeposit.findUnique({
            where: { id: depositId },
        });

        if (!deposit || deposit.status !== "RECEIVED") {
            throw new Error("Deposit not in received status or not found");
        }

        // Post credit to folio
        await tx.folioTransaction.create({
            data: {
                folioId,
                type: "Payment",
                description: `Advance Deposit Applied (${deposit.paymentMethod} - ${deposit.transactionRef ?? "N/A"})`,
                amount: deposit.amount.negated(), // Credit reduces balance
                paymentMode: deposit.paymentMethod,
            },
        });

        await tx.folio.update({
            where: { id: folioId },
            data: { balance: { decrement: deposit.amount } },
        });

        return tx.reservationDeposit.update({
            where: { id: depositId },
            data: {
                status: "APPLIED",
                appliedAt: new Date(),
            },
        });
    });
}

export async function forfeitDepositOnCancellation(depositId: string, reason: string) {
    return prisma.reservationDeposit.update({
        where: { id: depositId },
        data: {
            status: "FORFEITED",
            forfeitedAt: new Date(),
            notes: reason,
        },
    });
}

export async function refundDeposit(depositId: string, refundRef: string) {
    return prisma.$transaction(async (tx) => {
        const deposit = await tx.reservationDeposit.findUnique({
            where: { id: depositId },
        });

        if (!deposit) throw new Error("Deposit not found");

        await tx.reservation.update({
            where: { id: deposit.reservationId },
            data: {
                advanceDeposit: { decrement: deposit.amount },
                balanceDue: { increment: deposit.amount },
            },
        });

        return tx.reservationDeposit.update({
            where: { id: depositId },
            data: {
                status: "REFUNDED",
                refundedAt: new Date(),
                transactionRef: `REFUND-${refundRef}`,
            },
        });
    });
}
