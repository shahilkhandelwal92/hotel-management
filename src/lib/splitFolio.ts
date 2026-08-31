/**
 * Enterprise Split Folio & Window Routing Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages multiple folio windows (Window 1: Room & Tax, Window 2: Personal,
 * Window 3: Company, Window 4: Travel Agent), automated category routing,
 * and inter-window charge transfers.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateFolioWindowParams {
    folioId: string;
    windowNumber: number;
    name: string;
    payerType?: "GUEST" | "COMPANY" | "TRAVEL_AGENT";
    payerId?: string | null;
}

export interface SetRoutingRuleParams {
    folioId: string;
    targetWindowId: string;
    chargeCategory: string; // ROOM_CHARGE, FOOD_BEVERAGE, AMENITY, MINIBAR, LAUNDRY, SPA, ALL
}

export interface TransferChargeParams {
    folioId: string;
    sourceWindowId: string;
    targetWindowId: string;
    amount: Prisma.Decimal | number | string;
    reason: string;
    actorId: string;
}

export async function createFolioWindow(params: CreateFolioWindowParams) {
    const { folioId, windowNumber, name, payerType = "GUEST", payerId } = params;

    return prisma.folioWindow.create({
        data: {
            folioId,
            windowNumber,
            name,
            payerType,
            payerId: payerId ?? null,
            balance: new Prisma.Decimal(0),
        },
    });
}

export async function configureRoutingRule(params: SetRoutingRuleParams) {
    const { folioId, targetWindowId, chargeCategory } = params;

    return prisma.folioRoutingRule.create({
        data: {
            folioId,
            targetWindowId,
            chargeCategory,
        },
    });
}

export async function postChargeToFolioWindow(
    folioId: string,
    chargeCategory: string,
    amount: Prisma.Decimal | number | string,
    description: string,
    postedById?: string
) {
    const decAmount = new Prisma.Decimal(amount.toString());

    // Check if there is an active routing rule
    const rule = await prisma.folioRoutingRule.findFirst({
        where: {
            folioId,
            OR: [{ chargeCategory }, { chargeCategory: "ALL" }],
        },
        include: { targetWindow: true },
    });

    let targetWindowId: string;

    if (rule) {
        targetWindowId = rule.targetWindowId;
    } else {
        // Fallback or create Window 1
        let window1 = await prisma.folioWindow.findFirst({
            where: { folioId, windowNumber: 1 },
        });
        if (!window1) {
            window1 = await createFolioWindow({
                folioId,
                windowNumber: 1,
                name: "Master / Room",
            });
        }
        targetWindowId = window1.id;
    }

    return prisma.$transaction(async (tx) => {
        // 1. Create transaction on master folio
        const txn = await tx.folioTransaction.create({
            data: {
                folioId,
                type: "Charge",
                description: `${description} [Window Charge: ${chargeCategory}]`,
                amount: decAmount,
                postedById: postedById ?? null,
            },
        });

        // 2. Update master folio balance
        await tx.folio.update({
            where: { id: folioId },
            data: { balance: { increment: decAmount } },
        });

        // 3. Update window balance
        const updatedWindow = await tx.folioWindow.update({
            where: { id: targetWindowId },
            data: { balance: { increment: decAmount } },
        });

        return { txn, targetWindow: updatedWindow };
    });
}

export async function transferBetweenFolioWindows(params: TransferChargeParams) {
    const { folioId, sourceWindowId, targetWindowId, amount, reason, actorId } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        // Deduct from source window
        const src = await tx.folioWindow.update({
            where: { id: sourceWindowId },
            data: { balance: { decrement: decAmount } },
        });

        // Add to target window
        const tgt = await tx.folioWindow.update({
            where: { id: targetWindowId },
            data: { balance: { increment: decAmount } },
        });

        // Record audit transaction
        const txn = await tx.folioTransaction.create({
            data: {
                folioId,
                type: "Transfer",
                description: `Transfer from ${src.name} to ${tgt.name}: ${reason}`,
                amount: new Prisma.Decimal(0), // Balance neutral to total folio
                postedById: actorId,
            },
        });

        return { sourceWindow: src, targetWindow: tgt, transferTxn: txn };
    });
}

export async function getFolioWindowsSummary(folioId: string) {
    const windows = await prisma.folioWindow.findMany({
        where: { folioId },
        include: { routingRules: true },
        orderBy: { windowNumber: "asc" },
    });

    let totalBalance = new Prisma.Decimal(0);
    for (const w of windows) {
        totalBalance = totalBalance.plus(w.balance);
    }

    return {
        folioId,
        windows,
        totalBalance,
    };
}
