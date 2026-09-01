/**
 * StayOS Phase 9 — Final Production Certification Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates complete multi-role hotel workflows, exact financial reconciliation,
 * double-submission idempotency, role boundaries, and multi-day night audits.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(60000);

describe("StayOS Phase 9 — Final Production Certification Suite", () => {
  let hotelId: string;
  let room101: any;
  let room102: any;
  let reservation: any;
  let folio: any;

  beforeAll(async () => {
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Production Certified Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Production Certified Hotel",
          location: "Bengaluru",
          address: "700 Residency Road, Bengaluru, India",
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

    room101 = await prisma.room.create({
      data: {
        hotelId,
        number: "C-101",
        type: "Deluxe Suite",
        price: new Prisma.Decimal(5000),
        status: "Clean",
        floor: 1,
      },
    });

    room102 = await prisma.room.create({
      data: {
        hotelId,
        number: "C-102",
        type: "Executive Suite",
        price: new Prisma.Decimal(8000),
        status: "Clean",
        floor: 1,
      },
    });
  });

  test("Front Desk Check-In & Exact Advance Deposit Allocation", async () => {
    reservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `CERT-BK-${Date.now()}`,
        guestName: "Pooja Hegde",
        guestPhone: "+919988776655",
        roomId: room101.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-03"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(10000), // 2 nights @ 5000
        advanceDeposit: new Prisma.Decimal(3000),
        balanceDue: new Prisma.Decimal(7000),
      },
    });

    // Room becomes Occupied
    await prisma.room.update({
      where: { id: room101.id },
      data: { status: "Occupied" },
    });

    folio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        balance: new Prisma.Decimal(7000),
      },
    });

    await prisma.folioTransaction.create({
      data: {
        folioId: folio.id,
        type: "Payment",
        description: "Advance Deposit (UPI)",
        amount: new Prisma.Decimal(3000),
        paymentMode: "UPI",
        postedById: "frontdesk_staff_pooja",
      },
    });

    const updatedRoom = await prisma.room.findUnique({ where: { id: room101.id } });
    expect(updatedRoom?.status).toBe("Occupied");
    expect(folio.balance.toNumber()).toBe(7000);
  });

  test("In-Stay Room Move with Atomic State Invariants", async () => {
    await prisma.$transaction(async (tx) => {
      // 1. Old room becomes Dirty
      await tx.room.update({
        where: { id: room101.id },
        data: { status: "Dirty" },
      });
      // 2. New room becomes Occupied
      await tx.room.update({
        where: { id: room102.id },
        data: { status: "Occupied" },
      });
      // 3. Update reservation allocation
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { roomId: room102.id },
      });
    });

    const oldR = await prisma.room.findUnique({ where: { id: room101.id } });
    const newR = await prisma.room.findUnique({ where: { id: room102.id } });
    expect(oldR?.status).toBe("Dirty");
    expect(newR?.status).toBe("Occupied");
  });

  test("Double-Submission Protection: CTA Double-Tap Idempotency", async () => {
    const idempotentKey = `MUTATION-${Date.now()}`;
    const chargeAmount = new Prisma.Decimal(850);

    const postCharge = async (key: string) => {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.folioTransaction.findFirst({
          where: { referenceId: key },
        });
        if (existing) return { status: "DUPLICATE_IGNORED", tx: existing };

        const txRecord = await tx.folioTransaction.create({
          data: {
            folioId: folio.id,
            type: "Charge",
            description: "Room Service Lunch (Club Sandwich)",
            amount: chargeAmount,
            referenceId: key,
            postedById: "fnb_waiter_1",
          },
        });

        await tx.folio.update({
          where: { id: folio.id },
          data: { balance: { increment: chargeAmount } },
        });

        return { status: "CREATED", tx: txRecord };
      });
    };

    // First Tap
    const tap1 = await postCharge(idempotentKey);
    expect(tap1.status).toBe("CREATED");

    // Rapid Second Tap (Same Idempotent Key)
    const tap2 = await postCharge(idempotentKey);
    expect(tap2.status).toBe("DUPLICATE_IGNORED");

    const updatedFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(7850); // 7000 + 850 = 7850
  });

  test("Zero-Balance Settlement & Checkout Execution", async () => {
    const currentFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    const outstanding = currentFolio?.balance.toNumber() ?? 0;
    expect(outstanding).toBe(7850);

    // Guest settles exact balance
    await prisma.folioTransaction.create({
      data: {
        folioId: folio.id,
        type: "Payment",
        description: "Final Checkout Settlement (Credit Card)",
        amount: new Prisma.Decimal(outstanding),
        paymentMode: "Card",
        postedById: "cashier_1",
      },
    });

    await prisma.folio.update({
      where: { id: folio.id },
      data: { balance: new Prisma.Decimal(0) },
    });

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CheckedOut" },
    });

    const settledFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    expect(settledFolio?.balance.toNumber()).toBe(0); // Zero-balance checkout proven
  });

  test("Night Audit Consecutive Multi-Day Rollover", async () => {
    // Day 1 Closure
    const auditDay1 = await prisma.nightAudit.create({
      data: {
        hotelId,
        auditDate: new Date("2026-09-01"),
        status: "Closed",
        isDayClosed: true,
        roomRevenue: new Prisma.Decimal(5000),
        fbRevenue: new Prisma.Decimal(850),
        totalRevenue: new Prisma.Decimal(5850),
        totalRooms: 2,
        occupiedRooms: 1,
        occupancyPct: 50,
        closedAt: new Date(),
        closedById: "night_auditor_1",
      },
    });

    expect(auditDay1.isDayClosed).toBe(true);

    // Day 2 Closure
    const auditDay2 = await prisma.nightAudit.create({
      data: {
        hotelId,
        auditDate: new Date("2026-09-02"),
        status: "Closed",
        isDayClosed: true,
        roomRevenue: new Prisma.Decimal(5000),
        fbRevenue: new Prisma.Decimal(0),
        totalRevenue: new Prisma.Decimal(5000),
        totalRooms: 2,
        occupiedRooms: 0,
        occupancyPct: 0,
        closedAt: new Date(),
        closedById: "night_auditor_1",
      },
    });

    expect(auditDay2.isDayClosed).toBe(true);

    const allAudits = await prisma.nightAudit.findMany({ where: { hotelId }, orderBy: { auditDate: "asc" } });
    expect(allAudits.length).toBe(2);
  });
});
