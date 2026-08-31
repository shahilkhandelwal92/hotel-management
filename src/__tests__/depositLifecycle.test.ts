/**
 * Deposit Lifecycle Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies advance deposit recording, check-in folio application,
 * and cancellation refunds.
 */

import {
    recordReservationDeposit,
    applyDepositToCheckIn,
    refundDeposit,
} from "@/lib/depositLifecycle";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise Deposit Lifecycle Engine", () => {
    let testHotelId: string;
    let testReservationId: string;
    let testFolioId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Deposit Test Guest",
                guestPhone: "9876543210",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000 * 2),
                status: "Confirmed",
                baseAmount: new Prisma.Decimal("10000.00"),
                taxAmount: new Prisma.Decimal("1200.00"),
                totalAmount: new Prisma.Decimal("11200.00"),
                advanceDeposit: new Prisma.Decimal("0.00"),
                balanceDue: new Prisma.Decimal("11200.00"),
            },
        });
        testReservationId = res.id;

        const folio = await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res.id,
                balance: new Prisma.Decimal("11200.00"),
                status: "Open",
            },
        });
        testFolioId = folio.id;
    });

    test("records an advance deposit and adjusts reservation balance due", async () => {
        const deposit = await recordReservationDeposit({
            hotelId: testHotelId,
            reservationId: testReservationId,
            amount: 5000,
            paymentMethod: "UPI",
            transactionRef: "UPI-DEP-998877",
            notes: "50% advance guarantee",
        });

        expect(deposit.status).toBe("RECEIVED");
        expect(deposit.amount.toNumber()).toBe(5000);

        const updatedRes = await prisma.reservation.findUnique({
            where: { id: testReservationId },
        });

        expect(updatedRes?.advanceDeposit.toNumber()).toBe(5000);
        expect(updatedRes?.balanceDue.toNumber()).toBe(6200);
    });

    test("applies received deposit at check-in as folio credit", async () => {
        const deposit = await prisma.reservationDeposit.findFirst({
            where: { reservationId: testReservationId, status: "RECEIVED" },
        });

        if (!deposit) throw new Error("Deposit not found");

        const applied = await applyDepositToCheckIn(deposit.id, testFolioId);
        expect(applied.status).toBe("APPLIED");

        const updatedFolio = await prisma.folio.findUnique({
            where: { id: testFolioId },
        });

        // 11200 - 5000 = 6200
        expect(updatedFolio?.balance.toNumber()).toBe(6200);
    });

    test("processes deposit refund and re-adjusts balance due", async () => {
        const refundDep = await recordReservationDeposit({
            hotelId: testHotelId,
            reservationId: testReservationId,
            amount: 2000,
            paymentMethod: "CreditCard",
            transactionRef: "CC-REF-112233",
        });

        const refunded = await refundDeposit(refundDep.id, "REF-CC-112233");
        expect(refunded.status).toBe("REFUNDED");

        const updatedRes = await prisma.reservation.findUnique({
            where: { id: testReservationId },
        });

        expect(updatedRes?.advanceDeposit.toNumber()).toBe(5000);
    });
});
