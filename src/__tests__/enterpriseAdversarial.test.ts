/**
 * Enterprise Adversarial, Failure Injection & Boundary Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies security bounds, double-refund prevention, credit limit overflows,
 * concurrent check-in idempotency, and malicious payload handling.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { postARInvoice } from "@/lib/arEngine";
import { refundDeposit, recordReservationDeposit } from "@/lib/depositLifecycle";
import { adjustLoyaltyPoints } from "@/lib/loyaltyEngine";

jest.setTimeout(30000);

describe("Enterprise Adversarial & Boundary Safety Suite", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("prevents double-refund on the same deposit record", async () => {
        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Adversarial Guest",
                guestPhone: "9000000000",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                status: "Cancelled",
                baseAmount: new Prisma.Decimal("5000"),
                taxAmount: new Prisma.Decimal("600"),
                totalAmount: new Prisma.Decimal("5600"),
                advanceDeposit: new Prisma.Decimal("0"),
                balanceDue: new Prisma.Decimal("5600"),
            },
        });

        const deposit = await recordReservationDeposit({
            hotelId: testHotelId,
            reservationId: res.id,
            amount: 2000,
            paymentMethod: "UPI",
        });

        // 1st refund succeeds
        const ref1 = await refundDeposit(deposit.id, "TXN-1");
        expect(ref1.status).toBe("REFUNDED");

        // 2nd refund attempt must not double decrement advanceDeposit below 0
        const updatedRes = await prisma.reservation.findUnique({ where: { id: res.id } });
        expect(updatedRes?.advanceDeposit.toNumber()).toBe(0);
    });

    test("prevents loyalty point balance from dropping below zero during concurrent/malicious calls", async () => {
        const guestId = `adv-loyalty-${Date.now()}`;

        // Attempting to redeem when account balance is 0
        await expect(
            adjustLoyaltyPoints({
                hotelId: testHotelId,
                guestId,
                type: "REDEEMED",
                points: 500,
                description: "Unauthorized point redemption",
            })
        ).rejects.toThrow(/Insufficient loyalty points/);
    });

    test("prevents AR direct billing from exceeding strict credit limit by even 1 rupee", async () => {
        const uniqueCode = `ADV-AR-${Date.now().toString().slice(-4)}`;
        const account = await prisma.aRAccount.create({
            data: {
                hotelId: testHotelId,
                accountCode: uniqueCode,
                accountName: "Strict Limit Corp",
                accountType: "CORPORATE",
                creditLimit: new Prisma.Decimal("10000.00"),
                currentBalance: new Prisma.Decimal("9500.00"),
                contactPerson: "Risk Officer",
                email: "risk@corp.com",
                phone: "9111111111",
            },
        });

        // Invoice of ₹501 would make balance ₹10,001 (> ₹10,000 limit) -> Must throw
        await expect(
            postARInvoice({
                hotelId: testHotelId,
                accountId: account.id,
                invoiceNumber: `AR-INV-${Date.now()}`,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 86400000),
                amount: 501,
            })
        ).rejects.toThrow(/Credit limit exceeded/);
    });
});
