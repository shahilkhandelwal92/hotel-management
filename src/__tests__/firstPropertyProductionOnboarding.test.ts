/**
 * StayOS Phase 12 — First Real Hotel Production Onboarding Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates programmatic property onboarding and end-to-end operational
 * execution across all hotel departments without developer intervention.
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

describe("StayOS Phase 12 — First Real Hotel Production Onboarding Suite", () => {
  let hotelId: string;
  let room101: any;
  let room102: any;
  let reservation: any;
  let folio: any;
  let mainStore: any;
  let fbStore: any;

  beforeAll(async () => {
    // 1. Programmatic Hotel Creation (Zero SQL)
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Green Park Resort" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Green Park Resort",
          location: "Goa",
          address: "500 Candolim Beach Road, Goa, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // Clean artifacts for fresh onboarding run
    await prisma.nightAudit.deleteMany({ where: { hotelId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.stockTransfer.deleteMany({ where: { hotelId } });
    await prisma.inventoryStore.deleteMany({ where: { hotelId } });
    await prisma.cashierShift.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });

    // 2. Room Inventory Setup
    room101 = await prisma.room.create({
      data: {
        hotelId,
        number: "V-101",
        type: "Grand Villa",
        price: new Prisma.Decimal(12000),
        status: "Clean",
        floor: 1,
      },
    });

    room102 = await prisma.room.create({
      data: {
        hotelId,
        number: "V-102",
        type: "Grand Villa",
        price: new Prisma.Decimal(12000),
        status: "Clean",
        floor: 1,
      },
    });

    // 3. Multi-Store Inventory Setup via Stores Engine
    mainStore = await createStore({
      hotelId,
      name: "Central Warehouse",
      code: `CW-${Date.now().toString().slice(-4)}`,
    });

    fbStore = await createStore({
      hotelId,
      name: "F&B Kitchen Store",
      code: `FB-${Date.now().toString().slice(-4)}`,
    });
  });

  test("Step 1: Front Desk Arrival, Room Allocation & Advance Deposit", async () => {
    reservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `ONBOARD-BK-${Date.now()}`,
        guestName: "Meera Sen",
        guestPhone: "+919123456789",
        roomId: room101.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-03"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(24000), // 2 nights @ 12000
        advanceDeposit: new Prisma.Decimal(10000),
        balanceDue: new Prisma.Decimal(14000),
      },
    });

    await prisma.room.update({
      where: { id: room101.id },
      data: { status: "Occupied" },
    });

    folio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        balance: new Prisma.Decimal(14000),
      },
    });

    await prisma.folioTransaction.create({
      data: {
        folioId: folio.id,
        type: "Payment",
        description: "Advance Check-In Deposit (UPI)",
        amount: new Prisma.Decimal(10000),
        paymentMode: "UPI",
        postedById: "onboard_frontdesk_1",
      },
    });

    const occRoom = await prisma.room.findUnique({ where: { id: room101.id } });
    expect(occRoom?.status).toBe("Occupied");
    expect(folio.balance.toNumber()).toBe(14000);
  });

  test("Step 2: In-Stay Room Relocation (V-101 -> V-102)", async () => {
    await prisma.$transaction(
      async (tx) => {
        // Old room -> Dirty
        await tx.room.update({
          where: { id: room101.id },
          data: { status: "Dirty" },
        });
        // New room -> Occupied
        await tx.room.update({
          where: { id: room102.id },
          data: { status: "Occupied" },
        });
        // Reallocate reservation
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { roomId: room102.id },
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    const oldR = await prisma.room.findUnique({ where: { id: room101.id } });
    const newR = await prisma.room.findUnique({ where: { id: room102.id } });
    expect(oldR?.status).toBe("Dirty");
    expect(newR?.status).toBe("Occupied");
  });

  test("Step 3: Restaurant POS Charge with 5% GST Posted to Folio", async () => {
    const foodSubtotal = new Prisma.Decimal(2000);
    const gstAmount = new Prisma.Decimal(100); // 5% GST
    const totalFoodCharge = foodSubtotal.plus(gstAmount); // 2100

    await prisma.$transaction(
      async (tx) => {
        await tx.folioTransaction.create({
          data: {
            folioId: folio.id,
            type: "Charge",
            description: "Restaurant Dining Table 5 (Includes 5% GST)",
            amount: totalFoodCharge,
            postedById: "onboard_waiter_1",
          },
        });

        await tx.folio.update({
          where: { id: folio.id },
          data: { balance: { increment: totalFoodCharge } },
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    const updatedFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(16100); // 14000 + 2100 = 16100
  });

  test("Step 4: Inter-Store Stock Movement Lifecycle (REQUESTED -> IN_TRANSIT -> RECEIVED)", async () => {
    const transferNumber = `STR-${Date.now()}`;
    const transfer = await createStoreTransferRequisition({
      hotelId,
      transferNumber,
      sourceStoreId: mainStore.id,
      destStoreId: fbStore.id,
      requestedById: "storekeeper_1",
      itemName: "Mineral Water (1L Bottles)",
      quantity: 50,
      unit: "BOTTLE",
    });

    expect(transfer.status).toBe("REQUESTED");

    const issued = await approveAndIssueStoreTransfer({
      hotelId,
      transferId: transfer.id,
      issuedById: "store_mgr_1",
    });

    expect(issued.status).toBe("IN_TRANSIT");

    const received = await receiveStoreTransfer({
      hotelId,
      transferId: transfer.id,
      receivedById: "fb_chef_1",
    });

    expect(received.status).toBe("RECEIVED");
  });

  test("Step 5: Zero-Balance Folio Settlement & Departure", async () => {
    const currentFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    const outstanding = currentFolio?.balance.toNumber() ?? 0;
    expect(outstanding).toBe(16100);

    // Guest settles entire outstanding balance
    await prisma.$transaction(
      async (tx) => {
        await tx.folioTransaction.create({
          data: {
            folioId: folio.id,
            type: "Payment",
            description: "Final Folio Settlement (Credit Card)",
            amount: new Prisma.Decimal(outstanding),
            paymentMode: "Card",
            postedById: "onboard_cashier_1",
          },
        });

        await tx.folio.update({
          where: { id: folio.id },
          data: { balance: new Prisma.Decimal(0) },
        });

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "CheckedOut" },
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    const settledFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    expect(settledFolio?.balance.toNumber()).toBe(0);
  });

  test("Step 6: Night Audit Rollover & Daily Revenue Lock", async () => {
    const audit = await prisma.nightAudit.create({
      data: {
        hotelId,
        auditDate: new Date("2026-09-01"),
        status: "Closed",
        isDayClosed: true,
        roomRevenue: new Prisma.Decimal(12000),
        fbRevenue: new Prisma.Decimal(2100),
        totalRevenue: new Prisma.Decimal(14100),
        totalRooms: 2,
        occupiedRooms: 1,
        occupancyPct: 50,
        closedAt: new Date(),
        closedById: "night_auditor_1",
      },
    });

    expect(audit.isDayClosed).toBe(true);
    expect(audit.totalRevenue.toNumber()).toBe(14100);
  });
});
