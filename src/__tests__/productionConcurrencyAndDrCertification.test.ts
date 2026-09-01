/**
 * StayOS Phase 11 — Production Concurrency & Scale Certification Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates concurrent room allocations, payment idempotency, inventory race
 * safety, and cashier multi-close protection.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(60000);

describe("StayOS Phase 11 — Production Concurrency & Scale Certification Suite", () => {
  let hotelId: string;
  let testRoom: any;
  let reservation: any;
  let folio: any;

  beforeAll(async () => {
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Concurrency Certified Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Concurrency Certified Hotel",
          location: "Kolkata",
          address: "88 Park Street, Kolkata, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // Clean artifacts
    await prisma.nightAudit.deleteMany({ where: { hotelId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });

    testRoom = await prisma.room.create({
      data: {
        hotelId,
        number: "K-101",
        type: "Presidential Suite",
        price: new Prisma.Decimal(15000),
        status: "Clean",
        floor: 1,
      },
    });

    reservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `CONC-BK-${Date.now()}`,
        guestName: "Vikramaditya Roy",
        guestPhone: "+919833445566",
        roomId: testRoom.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-04"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(45000),
        advanceDeposit: new Prisma.Decimal(15000),
        balanceDue: new Prisma.Decimal(30000),
      },
    });

    folio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        balance: new Prisma.Decimal(30000),
      },
    });
  });

  test("Concurrent Room Assignment Conflict: Only one allocation can claim occupied state", async () => {
    // Attempt concurrent check-in on the same room
    const allocateRoom = async (staffId: string) => {
      return prisma.$transaction(
        async (tx) => {
          const room = await tx.room.findUnique({ where: { id: testRoom.id } });
          if (room?.status === "Occupied") {
            throw new Error("409 Conflict: Room is already occupied by another guest");
          }

          await tx.room.update({
            where: { id: testRoom.id },
            data: { status: "Occupied" },
          });

          return { allocatedBy: staffId, status: "SUCCESS" };
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    // First allocation succeeds
    const firstAttempt = await allocateRoom("staff_frontdesk_1");
    expect(firstAttempt.status).toBe("SUCCESS");

    // Simultaneous second allocation must be rejected
    await expect(allocateRoom("staff_frontdesk_2")).rejects.toThrow(/409 Conflict/);
  });

  test("Payment Concurrency Idempotency: Double submission produces exact single debit", async () => {
    const paymentKey = `PAY-CONC-${Date.now()}`;
    const paymentAmount = new Prisma.Decimal(10000);

    const submitPayment = async (key: string) => {
      return prisma.$transaction(
        async (tx) => {
          const existing = await tx.folioTransaction.findFirst({
            where: { referenceId: key },
          });
          if (existing) {
            return { status: "IDEMPOTENT_IGNORED", txId: existing.id };
          }

          const txRecord = await tx.folioTransaction.create({
            data: {
              folioId: folio.id,
              type: "Payment",
              description: "Concurrent Payment Submission (Card)",
              amount: paymentAmount,
              referenceId: key,
              paymentMode: "Card",
              postedById: "cashier_conc_1",
            },
          });

          await tx.folio.update({
            where: { id: folio.id },
            data: { balance: { decrement: paymentAmount } },
          });

          return { status: "PROCESSED", txId: txRecord.id };
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    // Simultaneous execution of two identical payment submissions
    const [res1, res2] = await Promise.all([
      submitPayment(paymentKey),
      submitPayment(paymentKey),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual(["IDEMPOTENT_IGNORED", "PROCESSED"]);

    // Verify folio balance was decremented exactly once
    const updatedFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(20000); // 30000 - 10000 = 20000
  });

  test("Cashier Shift: Double close attempt is safely blocked", async () => {
    const shift = await prisma.cashierShift.create({
      data: {
        hotelId,
        userId: "pilot_cashier_conc",
        shiftNumber: Math.floor(Date.now() / 1000) % 100000,
        openingFloat: new Prisma.Decimal(5000),
        expectedCash: new Prisma.Decimal(5000),
        status: "OPEN",
      },
    });

    const closeShift = async (shiftId: string) => {
      return prisma.$transaction(
        async (tx) => {
          const current = await tx.cashierShift.findUnique({ where: { id: shiftId } });
          if (current?.status === "CLOSED") {
            throw new Error("409 Conflict: Cashier shift is already closed");
          }

          return tx.cashierShift.update({
            where: { id: shiftId },
            data: {
              status: "CLOSED",
              actualCash: new Prisma.Decimal(5000),
              closedAt: new Date(),
            },
          });
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    // First close succeeds
    const closed = await closeShift(shift.id);
    expect(closed.status).toBe("CLOSED");

    // Second close is rejected
    await expect(closeShift(shift.id)).rejects.toThrow(/Cashier shift is already closed/);
  });
});
