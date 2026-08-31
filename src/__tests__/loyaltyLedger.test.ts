/**
 * Loyalty 2.0 Ledger Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies double-entry points accounting, tier progression (Silver -> Gold -> Platinum -> Diamond),
 * balance conservation, and insufficient point prevention.
 */

import {
    createLoyaltyAccount,
    adjustLoyaltyPoints,
} from "@/lib/loyaltyEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Loyalty 2.0 Points Ledger Engine", () => {
    let testHotelId: string;
    const testGuestId = `guest-loyalty-${Date.now()}`;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        await createLoyaltyAccount({
            hotelId: testHotelId,
            guestId: testGuestId,
            memberNumber: `LOYAL-${Date.now().toString().slice(-4)}`,
            tier: "SILVER",
        });
    });

    test("awards stay points and upgrades tier based on lifetime points", async () => {
        // Award 12,000 points (crosses Gold threshold 10,000)
        const result = await adjustLoyaltyPoints({
            hotelId: testHotelId,
            guestId: testGuestId,
            type: "EARNED",
            points: 12000,
            description: "Points earned for 4-night suite stay",
        });

        expect(result.account.pointsBalance).toBe(12000);
        expect(result.account.lifetimePoints).toBe(12000);
        expect(result.account.tier).toBe("GOLD");
        expect(result.transaction.balanceAfter).toBe(12000);
    });

    test("redeems points with exact ledger balance decrement", async () => {
        // Redeem 4,000 points for dining voucher
        const result = await adjustLoyaltyPoints({
            hotelId: testHotelId,
            guestId: testGuestId,
            type: "REDEEMED",
            points: 4000,
            description: "Redeemed for Fine Dining Voucher",
        });

        // 12000 - 4000 = 8000
        expect(result.account.pointsBalance).toBe(8000);
        expect(result.account.lifetimePoints).toBe(12000); // Lifetime does not decrease
        expect(result.transaction.points).toBe(-4000);
    });

    test("rejects redemption attempt exceeding available balance", async () => {
        // Attempting to redeem 15,000 when only 8,000 available
        await expect(
            adjustLoyaltyPoints({
                hotelId: testHotelId,
                guestId: testGuestId,
                type: "REDEEMED",
                points: 15000,
                description: "Overdraw attempt",
            })
        ).rejects.toThrow(/Insufficient loyalty points/);
    });
});
