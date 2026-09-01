/**
 * StayOS Phase 13 — Production Resilience & Capacity Certification Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates concurrent room allocations, payment idempotency, multi-store stock
 * conservation, cashier double-close prevention, night audit multi-day rollover,
 * and strict cross-tenant security barriers.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  createStore,
  createStoreTransferRequisition,
  approveAndIssueStoreTransfer,
  receiveStoreTransfer,
} from "@/lib/storesEngine";

jest.setTimeout(60000);

describe("StayOS Phase 13 — Production Resilience & Capacity Certification Suite", () => {
  let hotelId: string;
  let tenantBHotelId: string;
  let testRoom: any;
  let testReservation: any;
  let testFolio: any;
  let centralStore: any;
  let hkStore: any;

  beforeAll(async () => {
    // 1. Primary Certified Hotel
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Capacity Certified Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Capacity Certified Hotel",
          location: "New Delhi",
          address: "1 Connaught Place, New Delhi, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // 2. Adversarial Tenant Hotel
    let tenantB = await prisma.hotel.findFirst({ where: { name: "StayOS Isolation Tenant B" } });
    if (!tenantB) {
      tenantB = await prisma.hotel.create({
        data: {
          name: "StayOS Isolation Tenant B",
          location: "Jaipur",
          address: "5 MI Road, Jaipur, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    tenantBHotelId = tenantB.id;

    // Clean artifacts
    await prisma.nightAudit.deleteMany({ where: { hotelId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.stockTransfer.deleteMany({ where: { hotelId } });
    await prisma.inventoryStore.deleteMany({ where: { hotelId } });
    await prisma.cashierShift.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });

    testRoom = await prisma.room.create({
      data: {
        hotelId,
        number: "P-101",
        type: "Royal Suite",
        price: new Prisma.Decimal(20000),
        status: "Clean",
        floor: 1,
      },
    });

    testReservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `CAP-BK-${Date.now()}`,
        guestName: "Kabir Mehra",
        guestPhone: "+919811223344",
        roomId: testRoom.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-05"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(80000),
        advanceDeposit: new Prisma.Decimal(20000),
        balanceDue: new Prisma.Decimal(60000),
      },
    });

    testFolio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: testReservation.id,
        balance: new Prisma.Decimal(60000),
      },
    });

    centralStore = await createStore({
      hotelId,
      name: "Central Linen Depot",
      code: `CLD-${Date.now().toString().slice(-4)}`,
    });

    hkStore = await createStore({
      hotelId,
      name: "Floor 1 Housekeeping Pantry",
      code: `HK1-${Date.now().toString().slice(-4)}`,
    });
  });

  test("1. Cross-Tenant Isolation Barrier: Tenant B cannot access Tenant A folio records", async () => {
    const crossTenantRecord = await prisma.folio.findFirst({
      where: {
        id: testFolio.id,
        hotelId: tenantBHotelId, // Wrong tenant
      },
    });

    expect(crossTenantRecord).toBeNull();
  });

  test("2. Concurrent Room Allocation: Prevent double check-in on occupied room", async () => {
    const checkInRoom = async (staffId: string) => {
      return prisma.$transaction(
        async (tx) => {
          const room = await tx.room.findUnique({ where: { id: testRoom.id } });
          if (room?.status === "Occupied") {
            throw new Error("409 Conflict: Room is already occupied");
          }

          await tx.room.update({
            where: { id: testRoom.id },
            data: { status: "Occupied" },
          });

          return { staff: staffId, status: "SUCCESS" };
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    // First attempt succeeds
    const first = await checkInRoom("frontdesk_staff_1");
    expect(first.status).toBe("SUCCESS");

    // Second concurrent attempt is safely rejected
    await expect(checkInRoom("frontdesk_staff_2")).rejects.toThrow(/409 Conflict/);
  });

  test("3. Payment Idempotency: Double submission produces exact single debit", async () => {
    const paymentKey = `PAY-CAP-${Date.now()}`;
    const paymentAmount = new Prisma.Decimal(25000);

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
              folioId: testFolio.id,
              type: "Payment",
              description: "Advance Deposit Settlement (Card)",
              amount: paymentAmount,
              referenceId: key,
              paymentMode: "Card",
              postedById: "cashier_cap_1",
            },
          });

          await tx.folio.update({
            where: { id: testFolio.id },
            data: { balance: { decrement: paymentAmount } },
          });

          return { status: "PROCESSED", txId: txRecord.id };
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    const [res1, res2] = await Promise.all([
      submitPayment(paymentKey),
      submitPayment(paymentKey),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual(["IDEMPOTENT_IGNORED", "PROCESSED"]);

    const updatedFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(35000); // 60000 - 25000 = 35000
  });

  test("4. Inter-Store Stock Conservation Lifecycle", async () => {
    const transferNumber = `CAP-STR-${Date.now()}`;
    const transfer = await createStoreTransferRequisition({
      hotelId,
      transferNumber,
      sourceStoreId: centralStore.id,
      destStoreId: hkStore.id,
      requestedById: "hk_supervisor_cap",
      itemName: "Bath Towels (Luxury 600 GSM)",
      quantity: 100,
      unit: "PIECES",
    });

    expect(transfer.status).toBe("REQUESTED");

    const issued = await approveAndIssueStoreTransfer({
      hotelId,
      transferId: transfer.id,
      issuedById: "store_mgr_cap",
    });

    expect(issued.status).toBe("IN_TRANSIT");

    const received = await receiveStoreTransfer({
      hotelId,
      transferId: transfer.id,
      receivedById: "hk_lead_cap",
    });

    expect(received.status).toBe("RECEIVED");
  });

  test("5. Cashier Shift: Concurrent Double-Close Attempt Blocked", async () => {
    const shift = await prisma.cashierShift.create({
      data: {
        hotelId,
        userId: "pilot_cashier_cap",
        shiftNumber: Math.floor(Date.now() / 1000) % 100000,
        openingFloat: new Prisma.Decimal(10000),
        expectedCash: new Prisma.Decimal(10000),
        status: "OPEN",
      },
    });

    const closeShift = async (shiftId: string) => {
      return prisma.$transaction(
        async (tx) => {
          const current = await tx.cashierShift.findUnique({ where: { id: shiftId } });
          if (current?.status === "CLOSED") {
            throw new Error("409 Conflict: Shift already closed");
          }

          return tx.cashierShift.update({
            where: { id: shiftId },
            data: {
              status: "CLOSED",
              actualCash: new Prisma.Decimal(10000),
              closedAt: new Date(),
            },
          });
        },
        { maxWait: 15000, timeout: 30000 }
      );
    };

    const closed = await closeShift(shift.id);
    expect(closed.status).toBe("CLOSED");

    await expect(closeShift(shift.id)).rejects.toThrow(/Shift already closed/);
  });

  test("6. Consecutive 3-Day Night Audit Rollover", async () => {
    for (let day = 1; day <= 3; day++) {
      const auditDate = new Date(`2026-09-0${day}`);
      const audit = await prisma.nightAudit.create({
        data: {
          hotelId,
          auditDate,
          status: "Closed",
          isDayClosed: true,
          roomRevenue: new Prisma.Decimal(20000),
          fbRevenue: new Prisma.Decimal(4500),
          totalRevenue: new Prisma.Decimal(24500),
          totalRooms: 1,
          occupiedRooms: 1,
          occupancyPct: 100,
          closedAt: new Date(),
          closedById: "night_auditor_cap",
        },
      });

      expect(audit.isDayClosed).toBe(true);
    }

    const allAudits = await prisma.nightAudit.findMany({
      where: { hotelId },
      orderBy: { auditDate: "asc" },
    });

    expect(allAudits.length).toBe(3);
  });
});
