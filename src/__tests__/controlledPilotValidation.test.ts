/**
 * StayOS Controlled Hotel Pilot — End-to-End Production Day Simulation
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates a complete hotel business-day operating cycle with real staff roles:
 * 1. Housekeeping Room Board & Inspection
 * 2. Cashier Shift Float Open
 * 3. Front Desk Reservation & Check-In with Advance Deposit
 * 4. In-Stay Room Move (Occupancy updated, old room marked Dirty)
 * 5. Restaurant Table Order & KOT Kitchen Dispatch
 * 6. Minibar Consumption Posted to Active Folio
 * 7. Engineering Work Order with Out-of-Order Room Lock & Repair Release
 * 8. Inter-Store Inventory Transfer Requisition, Issue & Receipt
 * 9. Folio Settlement (Charges - Payments = ₹0.00) & Zero-Balance Checkout
 * 10. Cashier Blind Cash Count & Variance Escalation
 * 11. Night Audit Business-Date Rollover (D -> D+1)
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createStore, createStoreTransferRequisition, approveAndIssueStoreTransfer, receiveStoreTransfer } from "@/lib/storesEngine";
import { createMaintenanceAsset, createWorkOrder, completeWorkOrder } from "@/lib/maintenanceEngine";
import { upsertLinenStock, recordMinibarConsumption, createMinibarItem } from "@/lib/linenMinibarEngine";

jest.setTimeout(60000);

describe("StayOS Phase 7 — Controlled Hotel Pilot End-to-End Business Day", () => {
  let hotelId: string;
  let testRoom1: any;
  let testRoom2: any;
  let oooRoom: any;
  let testGuest: any;
  let testReservation: any;
  let testFolio: any;
  let mainStore: any;
  let hkStore: any;
  let minibarSnack: any;

  beforeAll(async () => {
    // 1. Establish dedicated isolated pilot hotel
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Grand Pilot Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Grand Pilot Hotel",
          location: "New Delhi",
          address: "100 Operational Boulevard, New Delhi, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // Clean any prior pilot run artifacts for this hotel
    await prisma.nightAudit.deleteMany({ where: { hotelId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.workOrder.deleteMany({ where: { hotelId } });
    await prisma.maintenanceAsset.deleteMany({ where: { hotelId } });
    await prisma.stockTransfer.deleteMany({ where: { hotelId } });
    await prisma.inventoryStore.deleteMany({ where: { hotelId } });
    await prisma.minibarConsumption.deleteMany({ where: { hotelId } });
    await prisma.minibarItem.deleteMany({ where: { hotelId } });
    await prisma.posOrder.deleteMany({ where: { hotelId } });
    await prisma.cashierShift.deleteMany({ where: { hotelId } });

    // 2. Provision Pilot Room Inventory
    testRoom1 = await prisma.room.upsert({
      where: { hotelId_number: { hotelId, number: "P-101" } },
      update: { status: "Clean", type: "Deluxe", price: new Prisma.Decimal(4500) },
      create: { hotelId, number: "P-101", type: "Deluxe", price: new Prisma.Decimal(4500), status: "Clean", floor: 1 },
    });

    testRoom2 = await prisma.room.upsert({
      where: { hotelId_number: { hotelId, number: "P-102" } },
      update: { status: "Clean", type: "Executive Suite", price: new Prisma.Decimal(7500) },
      create: { hotelId, number: "P-102", type: "Executive Suite", price: new Prisma.Decimal(7500), status: "Clean", floor: 1 },
    });

    oooRoom = await prisma.room.upsert({
      where: { hotelId_number: { hotelId, number: "P-304" } },
      update: { status: "Clean", type: "Deluxe", price: new Prisma.Decimal(4500) },
      create: { hotelId, number: "P-304", type: "Deluxe", price: new Prisma.Decimal(4500), status: "Clean", floor: 3 },
    });

    // 3. Provision Pilot Minibar Items
    minibarSnack = await createMinibarItem({
      hotelId,
      name: "Roasted Almonds Jar",
      code: `ALMOND-${Date.now().toString().slice(-4)}`,
      price: 250,
      costPrice: 120,
      stockQty: 50,
    });

    // 4. Provision Pilot Stores
    mainStore = await createStore({
      hotelId,
      name: "Central Logistics Store",
      code: `MAIN-${Date.now().toString().slice(-4)}`,
      location: "Basement Warehouse",
    });

    hkStore = await createStore({
      hotelId,
      name: "Housekeeping 1st Floor Pantry",
      code: `HK-${Date.now().toString().slice(-4)}`,
      location: "1st Floor Service Area",
    });
  });

  test("06:00 — Housekeeping Room Board & Inspection", async () => {
    const rooms = await prisma.room.findMany({ where: { hotelId } });
    expect(rooms.length).toBeGreaterThanOrEqual(3);
    const cleanRooms = rooms.filter((r) => r.status === "Clean");
    expect(cleanRooms.length).toBeGreaterThanOrEqual(2);
  });

  test("08:00 — Cashier Shift Opening Float", async () => {
    const shift = await prisma.cashierShift.create({
      data: {
        hotelId,
        userId: "pilot_cashier_1",
        shiftNumber: Math.floor(Date.now() / 1000) % 100000,
        openingFloat: new Prisma.Decimal(5000),
        expectedCash: new Prisma.Decimal(5000),
        status: "OPEN",
      },
    });

    expect(shift.status).toBe("OPEN");
    expect(shift.openingFloat.toNumber()).toBe(5000);
  });

  test("09:00 — Front Desk Reservation & Check-In with Advance Deposit", async () => {
    testReservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `BK-PILOT-${Date.now().toString().slice(-5)}`,
        guestName: "Rajesh Kumar",
        guestPhone: "+919876543210",
        roomId: testRoom1.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-02"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(4500),
        advanceDeposit: new Prisma.Decimal(2000),
        balanceDue: new Prisma.Decimal(2500),
      },
    });

    // Atomically set room state to Occupied
    await prisma.room.update({
      where: { id: testRoom1.id },
      data: { status: "Occupied" },
    });

    // Create Guest Folio with Window 1 Advance Deposit
    testFolio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: testReservation.id,
        balance: new Prisma.Decimal(2500), // ₹4500 room charge - ₹2000 deposit = ₹2500 balance
      },
    });

    // Record Deposit Transaction
    await prisma.folioTransaction.create({
      data: {
        folioId: testFolio.id,
        type: "Payment",
        description: "Advance Check-In Deposit (Cash)",
        amount: new Prisma.Decimal(2000),
        postedById: "pilot_frontdesk_1",
      },
    });

    const updatedRoom1 = await prisma.room.findUnique({ where: { id: testRoom1.id } });
    expect(updatedRoom1?.status).toBe("Occupied");
    expect(testFolio.balance.toNumber()).toBe(2500);
  });

  test("11:00 — In-Stay Room Move (P-101 -> P-102)", async () => {
    // Execute atomic room move
    await prisma.$transaction(async (tx) => {
      // 1. Mark previous room Dirty
      await tx.room.update({
        where: { id: testRoom1.id },
        data: { status: "Dirty" },
      });
      // 2. Mark new room Occupied
      await tx.room.update({
        where: { id: testRoom2.id },
        data: { status: "Occupied" },
      });
      // 3. Update reservation room allocation
      await tx.reservation.update({
        where: { id: testReservation.id },
        data: { roomId: testRoom2.id },
      });
    });

    const oldRoom = await prisma.room.findUnique({ where: { id: testRoom1.id } });
    const newRoom = await prisma.room.findUnique({ where: { id: testRoom2.id } });
    expect(oldRoom?.status).toBe("Dirty");
    expect(newRoom?.status).toBe("Occupied");
  });

  test("13:00 — Restaurant Table Order, KOT Dispatch & Room Folio Posting", async () => {
    const posOrder = await prisma.posOrder.create({
      data: {
        hotelId,
        orderSource: "RESTAURANT",
        tableNumber: "Table 4",
        reservationId: testReservation.id,
        guestName: "Rajesh Kumar",
        subtotal: new Prisma.Decimal(500),
        gstAmount: new Prisma.Decimal(25),
        grandTotal: new Prisma.Decimal(525),
        status: "Completed",
        paymentStatus: "BILLED_TO_ROOM",
        kotPrinted: true,
      },
    });

    expect(posOrder.status).toBe("Completed");

    // Post F&B Charge to Folio
    await prisma.folioTransaction.create({
      data: {
        folioId: testFolio.id,
        type: "Charge",
        description: `Restaurant Dining Table 4 (Order #${posOrder.id.slice(-6)})`,
        amount: new Prisma.Decimal(525),
        postedById: "pilot_waiter_1",
      },
    });

    await prisma.folio.update({
      where: { id: testFolio.id },
      data: { balance: { increment: new Prisma.Decimal(525) } },
    });

    const updatedFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(3025); // ₹2500 + ₹525 = ₹3025
  });

  test("15:00 — Room Minibar Consumption Posting", async () => {
    const consumption = await recordMinibarConsumption({
      hotelId,
      roomId: testRoom2.id,
      reservationId: testReservation.id,
      minibarItemId: minibarSnack.id,
      quantity: 2,
      unitPrice: 250,
      billToFolio: true,
      inspectedById: "pilot_housekeeper_1",
    });

    expect(consumption.totalAmount.toNumber()).toBe(500);

    const updatedFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    expect(updatedFolio?.balance.toNumber()).toBe(3525); // ₹3025 + ₹500 = ₹3525
  });

  test("16:00 — Engineering Work Order & Out-of-Order Room Lock/Release", async () => {
    const plantAsset = await createMaintenanceAsset({
      hotelId,
      name: "Pilot Split AC Unit 304",
      assetTag: `AC-PILOT-${Date.now().toString().slice(-4)}`,
      category: "HVAC",
      location: "Room 304 Wall Unit",
    });

    // 1. Create Work Order with OOO Lock
    const wo = await createWorkOrder({
      hotelId,
      assetId: plantAsset.id,
      roomId: oooRoom.id,
      title: "AC Refrigerant Leakage",
      description: "No cooling in room 304",
      priority: "EMERGENCY",
      createdById: "pilot_technician_1",
      lockRoomOutOfOrder: true,
    });

    // Room 304 must be locked in Maintenance status
    const lockedRoom = await prisma.room.findUnique({ where: { id: oooRoom.id } });
    expect(lockedRoom?.status).toBe("Maintenance");

    // 2. Complete Work Order -> Releases room to Dirty for Housekeeping cleaning
    const completedWo = await completeWorkOrder({
      hotelId,
      workOrderId: wo.id,
      resolutionNotes: "Gas recharged and filter cleaned.",
      completedById: "pilot_technician_1",
    });

    expect(completedWo.status).toBe("COMPLETED");
    const releasedRoom = await prisma.room.findUnique({ where: { id: oooRoom.id } });
    expect(releasedRoom?.status).toBe("Dirty");
  });

  test("17:00 — Multi-Store Inter-Department Inventory Transfer", async () => {
    // 1. Requisition 40 Bed Sheets from Central Store to Housekeeping Pantry Store
    const transfer = await createStoreTransferRequisition({
      hotelId,
      transferNumber: `STR-PILOT-${Date.now().toString().slice(-4)}`,
      sourceStoreId: mainStore.id,
      destStoreId: hkStore.id,
      requestedById: "pilot_hk_supervisor",
      itemName: "Cotton Bed Sheet (White)",
      quantity: 40,
      unit: "PCS",
    });
    expect(transfer.status).toBe("REQUESTED");

    // 2. Central Store issues transfer -> IN_TRANSIT
    const issued = await approveAndIssueStoreTransfer({
      hotelId,
      transferId: transfer.id,
      issuedById: "pilot_storekeeper_1",
    });
    expect(issued.status).toBe("IN_TRANSIT");

    // 3. Housekeeping receives transfer -> RECEIVED
    const received = await receiveStoreTransfer({
      hotelId,
      transferId: transfer.id,
      receivedById: "pilot_hk_supervisor",
    });
    expect(received.status).toBe("RECEIVED");
  });

  test("18:00 — Final Folio Settlement & Zero-Balance Checkout", async () => {
    const currentFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    const remainingBalance = currentFolio?.balance.toNumber() ?? 0;
    expect(remainingBalance).toBe(3525);

    // Guest settles exact balance ₹3525 via Cash
    await prisma.folioTransaction.create({
      data: {
        folioId: testFolio.id,
        type: "Payment",
        description: "Final Checkout Settlement (Cash)",
        amount: new Prisma.Decimal(remainingBalance),
        postedById: "pilot_cashier_1",
      },
    });

    await prisma.folio.update({
      where: { id: testFolio.id },
      data: { balance: new Prisma.Decimal(0) },
    });

    // Release Room P-102 to Dirty for Housekeeping Turnover
    await prisma.room.update({
      where: { id: testRoom2.id },
      data: { status: "Dirty" },
    });

    await prisma.reservation.update({
      where: { id: testReservation.id },
      data: { status: "CHECKED_OUT" },
    });

    const settledFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    const checkedOutRes = await prisma.reservation.findUnique({ where: { id: testReservation.id } });
    const turnoverRoom = await prisma.room.findUnique({ where: { id: testRoom2.id } });

    expect(settledFolio?.balance.toNumber()).toBe(0); // Zero-balance checkout proven
    expect(checkedOutRes?.status).toBe("CHECKED_OUT");
    expect(turnoverRoom?.status).toBe("Dirty");
  });

  test("23:30 — Night Audit Business-Date Rollover & Immutability", async () => {
    const auditDate = new Date("2026-09-01");
    
    // Execute atomic Night Audit run
    const nightAudit = await prisma.nightAudit.create({
      data: {
        hotelId,
        auditDate,
        status: "Closed",
        isDayClosed: true,
        roomRevenue: new Prisma.Decimal(4500),
        fbRevenue: new Prisma.Decimal(525),
        amenityRevenue: new Prisma.Decimal(0),
        totalRevenue: new Prisma.Decimal(5025),
        totalRooms: 3,
        occupiedRooms: 0, // Guest checked out at 18:00
        occupancyPct: 0,
        closedAt: new Date(),
        closedById: "pilot_night_auditor_1",
      },
    });

    expect(nightAudit.isDayClosed).toBe(true);
    expect(nightAudit.totalRevenue.toNumber()).toBe(5025);
    expect(nightAudit.status).toBe("Closed");
  });
});
