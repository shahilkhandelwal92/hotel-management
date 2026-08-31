/**
 * Cashier Shifts & Multi-Float Tracking Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies shift opening, cash transaction accumulation, closing cash reconciliation,
 * variance computation, and automatic variance approval requests.
 */

import {
    openCashierShift,
    recordCashTransactionOnShift,
    closeCashierShift,
} from "@/lib/cashierShiftEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Cashier Shift & Float Engine", () => {
    let testHotelId: string;
    let cashierUserId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const user = await prisma.user.findFirst({ where: { hotelId: testHotelId } });
        cashierUserId = user?.id ?? "test-cashier-user";
    });

    test("opens shift, logs cash payments and paid outs, and calculates expected cash", async () => {
        const shift = await openCashierShift({
            hotelId: testHotelId,
            userId: cashierUserId,
            openingFloat: 5000,
        });

        expect(shift.status).toBe("OPEN");
        expect(shift.openingFloat.toNumber()).toBe(5000);
        expect(shift.expectedCash.toNumber()).toBe(5000);

        // 1. Guest pays 12,000 cash for stay
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "PAYMENT",
            amount: 12000,
            description: "Room settlement cash payment",
        });

        // 2. Paid out 800 cash for taxi fare
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "PAID_OUT",
            amount: 800,
            description: "Guest airport taxi petty cash paid-out",
        });

        // 3. Cash drop of 10,000 to hotel safe
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "DROP",
            amount: 10000,
            description: "Mid-day safe drop",
        });

        // Expected = 5000 (float) + 12000 (payment) - 800 (paid-out) - 10000 (drop) = 6200
        const updatedShift = await prisma.cashierShift.findUnique({
            where: { id: shift.id },
        });

        expect(updatedShift?.cashPayments.toNumber()).toBe(12000);
        expect(updatedShift?.paidOuts.toNumber()).toBe(800);
        expect(updatedShift?.cashDrops.toNumber()).toBe(10000);
        expect(updatedShift?.expectedCash.toNumber()).toBe(6200);

        // Close shift with exact cash (6200) -> Variance 0
        const closed = await closeCashierShift({
            shiftId: shift.id,
            hotelId: testHotelId,
            actualClosingCash: 6200,
            closingNotes: "Exact cash drawer count",
            actorId: cashierUserId,
        });

        expect(closed.status).toBe("CLOSED");
        expect(closed.variance?.toNumber()).toBe(0);
    });

    test("flags variance and automatically submits approval request when cash does not match", async () => {
        // Open another shift
        const shift = await openCashierShift({
            hotelId: testHotelId,
            userId: cashierUserId,
            openingFloat: 3000,
        });

        // Cash payment of 2000 -> Expected = 5000
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "PAYMENT",
            amount: 2000,
            description: "Dining cash settlement",
        });

        // Close shift with actual 4800 (Shortage of -200)
        const closed = await closeCashierShift({
            shiftId: shift.id,
            hotelId: testHotelId,
            actualClosingCash: 4800,
            closingNotes: "Shortage of 200 due to change discrepancy",
            actorId: cashierUserId,
        });

        expect(closed.status).toBe("CLOSED");
        expect(closed.variance?.toNumber()).toBe(-200);

        // Verify approval request was triggered
        const approvalReq = await prisma.approvalRequest.findFirst({
            where: {
                hotelId: testHotelId,
                actionType: "CASHIER_VARIANCE",
                entityId: shift.id,
            },
        });

        expect(approvalReq).not.toBeNull();
        expect(approvalReq?.requestedAmount?.toNumber()).toBe(200);
    });
});
