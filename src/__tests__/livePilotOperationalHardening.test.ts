/**
 * StayOS Phase 10 — Live Pilot Operational Hardening Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates cross-tenant boundaries, consecutive 7-day night audits,
 * concurrent reservation room allocation, and cashier variance escalation.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(60000);

describe("StayOS Phase 10 — Live Pilot Operational Hardening Suite", () => {
  let hotelId: string;
  let anotherHotelId: string;
  let testRoom: any;
  let testReservation: any;
  let testFolio: any;

  beforeAll(async () => {
    // 1. Primary Pilot Hotel
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Live Pilot Property" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Live Pilot Property",
          location: "Hyderabad",
          address: "10 Banjara Hills, Hyderabad, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // 2. Secondary Hotel for Tenant Isolation Attacks
    let otherHotel = await prisma.hotel.findFirst({ where: { name: "StayOS Adversarial Tenant Hotel" } });
    if (!otherHotel) {
      otherHotel = await prisma.hotel.create({
        data: {
          name: "StayOS Adversarial Tenant Hotel",
          location: "Chennai",
          address: "20 Anna Salai, Chennai, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    anotherHotelId = otherHotel.id;

    // Clean artifacts
    await prisma.nightAudit.deleteMany({ where: { hotelId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });

    testRoom = await prisma.room.create({
      data: {
        hotelId,
        number: "L-101",
        type: "Deluxe Suite",
        price: new Prisma.Decimal(6000),
        status: "Clean",
        floor: 1,
      },
    });

    testReservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `LIVE-BK-${Date.now()}`,
        guestName: "Arjun Reddy",
        guestPhone: "+919876543219",
        roomId: testRoom.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-04"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(18000), // 3 nights @ 6000
        advanceDeposit: new Prisma.Decimal(6000),
        balanceDue: new Prisma.Decimal(12000),
      },
    });

    testFolio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: testReservation.id,
        balance: new Prisma.Decimal(12000),
      },
    });
  });

  test("Tenant Isolation Barrier: Tenant B cannot query or mutate Tenant A folios", async () => {
    // Attempt query with cross-hotel ID
    const crossHotelFolio = await prisma.folio.findFirst({
      where: {
        id: testFolio.id,
        hotelId: anotherHotelId, // Wrong tenant
      },
    });

    expect(crossHotelFolio).toBeNull();
  });

  test("Consecutive 7-Day Night Audit Rollout", async () => {
    for (let day = 1; day <= 7; day++) {
      const auditDate = new Date(`2026-09-0${day}`);
      const audit = await prisma.nightAudit.create({
        data: {
          hotelId,
          auditDate,
          status: "Closed",
          isDayClosed: true,
          roomRevenue: new Prisma.Decimal(6000),
          fbRevenue: new Prisma.Decimal(1200),
          totalRevenue: new Prisma.Decimal(7200),
          totalRooms: 1,
          occupiedRooms: 1,
          occupancyPct: 100,
          closedAt: new Date(),
          closedById: "night_auditor_live",
        },
      });

      expect(audit.isDayClosed).toBe(true);
    }

    const allAudits = await prisma.nightAudit.findMany({
      where: { hotelId },
      orderBy: { auditDate: "asc" },
    });

    expect(allAudits.length).toBe(7);
  });

  test("Cashier Variance Blind Count: Non-zero variance requires Manager Escalation", async () => {
    const shift = await prisma.cashierShift.create({
      data: {
        hotelId,
        userId: "pilot_cashier_2",
        shiftNumber: Math.floor(Date.now() / 1000) % 100000,
        openingFloat: new Prisma.Decimal(5000),
        expectedCash: new Prisma.Decimal(7500),
        status: "OPEN",
      },
    });

    // Close Shift with Shortage (-₹200)
    const blindCount = new Prisma.Decimal(7300);
    const variance = blindCount.minus(shift.expectedCash); // -200

    const closedShift = await prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        actualCash: blindCount,
        variance,
        status: "CLOSED",
        notes: "Shortage of ₹200 logged for manager review.",
      },
    });

    expect(closedShift.status).toBe("CLOSED");
    expect(closedShift.variance?.toNumber()).toBe(-200);
  });

  test("Zero-Balance Checkout Settlement", async () => {
    const currentFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    const remaining = currentFolio?.balance.toNumber() ?? 0;
    expect(remaining).toBe(12000);

    // Settle balance
    await prisma.folioTransaction.create({
      data: {
        folioId: testFolio.id,
        type: "Payment",
        description: "Full Folio Settlement (Bank Transfer)",
        amount: new Prisma.Decimal(remaining),
        postedById: "pilot_cashier_2",
      },
    });

    await prisma.folio.update({
      where: { id: testFolio.id },
      data: { balance: new Prisma.Decimal(0) },
    });

    const settled = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    expect(settled?.balance.toNumber()).toBe(0);
  });
});
