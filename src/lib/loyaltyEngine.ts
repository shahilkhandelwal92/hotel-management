/**
 * Enterprise Loyalty 2.0 Points Ledger Engine
 * ──────────────────────────────────────────────────────────────────────
 * Implements double-entry points accounting with strict balance conservation:
 * Opening Points + Earned - Redeemed - Expired = Closing Points
 *
 * Tracks tiers (Silver, Gold, Platinum, Diamond) and point lifecycle audits.
 */

import prisma from "@/lib/prisma";

export interface CreateLoyaltyAccountParams {
    hotelId: string;
    guestId: string;
    memberNumber: string;
    tier?: "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | string;
}

export interface AdjustLoyaltyPointsParams {
    hotelId: string;
    guestId: string;
    type: "EARNED" | "REDEEMED" | "EXPIRED" | "ADJUSTMENT" | "BONUS";
    points: number; // positive for earned/bonus, positive number to be deducted for redeemed/expired
    description: string;
    referenceId?: string;
}

export async function createLoyaltyAccount(params: CreateLoyaltyAccountParams) {
    const { hotelId, guestId, memberNumber, tier = "SILVER" } = params;

    return prisma.loyaltyAccount.create({
        data: {
            hotelId,
            guestId,
            memberNumber,
            tier,
            pointsBalance: 0,
            lifetimePoints: 0,
        },
    });
}

export async function adjustLoyaltyPoints(params: AdjustLoyaltyPointsParams) {
    const { hotelId, guestId, type, description, referenceId } = params;
    let points = params.points;

    // Normalise points sign: REDEEMED / EXPIRED are negative
    if ((type === "REDEEMED" || type === "EXPIRED") && points > 0) {
        points = -points;
    }

    return prisma.$transaction(async (tx) => {
        let account = await tx.loyaltyAccount.findFirst({
            where: { guestId, hotelId },
        });

        if (!account) {
            account = await tx.loyaltyAccount.create({
                data: {
                    hotelId,
                    guestId,
                    memberNumber: `LOYAL-${Date.now().toString().slice(-6)}`,
                    tier: "SILVER",
                    pointsBalance: 0,
                    lifetimePoints: 0,
                },
            });
        }

        const newBalance = account.pointsBalance + points;
        if (newBalance < 0) {
            throw new Error(`Insufficient loyalty points (Available: ${account.pointsBalance}, Requested: ${Math.abs(points)})`);
        }

        const lifetimeIncrement = points > 0 ? points : 0;
        const newLifetime = account.lifetimePoints + lifetimeIncrement;

        // Determine tier progression
        let newTier = account.tier;
        if (newLifetime >= 50000) newTier = "DIAMOND";
        else if (newLifetime >= 25000) newTier = "PLATINUM";
        else if (newLifetime >= 10000) newTier = "GOLD";

        const txn = await tx.loyaltyPointTransaction.create({
            data: {
                accountId: account.id,
                type,
                points,
                balanceAfter: newBalance,
                referenceId: referenceId ?? null,
                description,
            },
        });

        const updatedAccount = await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
                pointsBalance: newBalance,
                lifetimePoints: newLifetime,
                tier: newTier,
            },
        });

        return { account: updatedAccount, transaction: txn };
    }, { maxWait: 15000, timeout: 30000 });
}
