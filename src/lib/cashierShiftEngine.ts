/**
 * Enterprise Cashier Shifts & Multi-Float Tracking Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages front desk and outlet cashier shifts, opening floats, cash drops,
 * paid-outs, expected vs actual cash reconciliation, and variance approvals.
 *
 * Invariant:
 * Expected Cash = Opening Float + Cash Payments + Cash Sales - Refunds - Paid Outs - Cash Drops
 * Variance = Actual Cash - Expected Cash
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requestApproval } from "@/lib/approvalEngine";

export interface OpenShiftParams {
    hotelId: string;
    userId: string;
    terminalName?: string;
    openingFloat: Prisma.Decimal | number | string;
    notes?: string;
}

export interface CloseShiftParams {
    shiftId: string;
    hotelId: string;
    actualClosingCash: Prisma.Decimal | number | string;
    closingNotes?: string;
    actorId: string;
}

export async function openCashierShift(params: OpenShiftParams) {
    const { hotelId, userId, openingFloat, notes } = params;
    const decFloat = new Prisma.Decimal(openingFloat.toString());

    return prisma.cashierShift.create({
        data: {
            hotelId,
            userId,
            openingFloat: decFloat,
            cashPayments: new Prisma.Decimal(0),
            cashSales: new Prisma.Decimal(0),
            refunds: new Prisma.Decimal(0),
            paidOuts: new Prisma.Decimal(0),
            cashDrops: new Prisma.Decimal(0),
            expectedCash: decFloat,
            status: "OPEN",
            notes: notes ?? null,
        },
    });
}

export async function recordCashTransactionOnShift(params: {
    shiftId: string;
    type: "PAYMENT" | "SALE" | "REFUND" | "PAID_OUT" | "DROP";
    amount: Prisma.Decimal | number | string;
    description: string;
}) {
    const { shiftId, type, amount, description } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        const shift = await tx.cashierShift.findUnique({
            where: { id: shiftId },
        });

        if (!shift || shift.status !== "OPEN") {
            throw new Error("Shift is not open or not found");
        }

        let updateData: Prisma.CashierShiftUpdateInput = {};

        if (type === "PAYMENT") {
            const nextCash = shift.cashPayments.plus(decAmount);
            const expected = shift.openingFloat
                .plus(nextCash)
                .plus(shift.cashSales)
                .minus(shift.refunds)
                .minus(shift.paidOuts)
                .minus(shift.cashDrops);

            updateData = {
                cashPayments: nextCash,
                expectedCash: expected,
            };
        } else if (type === "SALE") {
            const nextSales = shift.cashSales.plus(decAmount);
            const expected = shift.openingFloat
                .plus(shift.cashPayments)
                .plus(nextSales)
                .minus(shift.refunds)
                .minus(shift.paidOuts)
                .minus(shift.cashDrops);

            updateData = {
                cashSales: nextSales,
                expectedCash: expected,
            };
        } else if (type === "REFUND") {
            const nextRefunds = shift.refunds.plus(decAmount);
            const expected = shift.openingFloat
                .plus(shift.cashPayments)
                .plus(shift.cashSales)
                .minus(nextRefunds)
                .minus(shift.paidOuts)
                .minus(shift.cashDrops);

            updateData = {
                refunds: nextRefunds,
                expectedCash: expected,
            };
        } else if (type === "PAID_OUT") {
            const nextPaidOuts = shift.paidOuts.plus(decAmount);
            const expected = shift.openingFloat
                .plus(shift.cashPayments)
                .plus(shift.cashSales)
                .minus(shift.refunds)
                .minus(nextPaidOuts)
                .minus(shift.cashDrops);

            updateData = {
                paidOuts: nextPaidOuts,
                expectedCash: expected,
            };
        } else if (type === "DROP") {
            const nextDrops = shift.cashDrops.plus(decAmount);
            const expected = shift.openingFloat
                .plus(shift.cashPayments)
                .plus(shift.cashSales)
                .minus(shift.refunds)
                .minus(shift.paidOuts)
                .minus(nextDrops);

            updateData = {
                cashDrops: nextDrops,
                expectedCash: expected,
            };
        }

        await tx.cashDrawerTransaction.create({
            data: {
                shiftId,
                type: type === "PAYMENT" ? "FOLIO_PAYMENT" : type === "DROP" ? "CASH_DROP" : type,
                amount: decAmount,
                notes: description,
            },
        });

        return tx.cashierShift.update({
            where: { id: shiftId },
            data: updateData,
        });
    }, { maxWait: 15000, timeout: 30000 });
}

export async function closeCashierShift(params: CloseShiftParams) {
    const { shiftId, hotelId, actualClosingCash, closingNotes, actorId } = params;
    const decActual = new Prisma.Decimal(actualClosingCash.toString());

    return prisma.$transaction(async (tx) => {
        const shift = await tx.cashierShift.findFirst({
            where: { id: shiftId, hotelId },
        });

        if (!shift || shift.status !== "OPEN") {
            throw new Error("Shift is not open or not found");
        }

        const expectedCash = shift.openingFloat
            .plus(shift.cashPayments)
            .plus(shift.cashSales)
            .minus(shift.refunds)
            .minus(shift.paidOuts)
            .minus(shift.cashDrops);

        const variance = decActual.minus(expectedCash);

        const closedShift = await tx.cashierShift.update({
            where: { id: shiftId },
            data: {
                closedAt: new Date(),
                expectedCash,
                actualCash: decActual,
                variance,
                status: "CLOSED",
                notes: closingNotes ?? shift.notes,
            },
        });

        // If variance is non-zero, automatically create approval/audit request
        if (!variance.isZero()) {
            await requestApproval({
                hotelId,
                requesterId: actorId,
                actionType: "CASHIER_VARIANCE",
                entityType: "CashierShift",
                entityId: shiftId,
                requestedAmount: variance.abs(),
                reason: `Cashier Shift variance of ${variance.toString()}`,
                metadata: {
                    expectedCash: expectedCash.toString(),
                    actualCash: decActual.toString(),
                    variance: variance.toString(),
                },
            });
        }

        return closedShift;
    }, { maxWait: 15000, timeout: 30000 });
}
