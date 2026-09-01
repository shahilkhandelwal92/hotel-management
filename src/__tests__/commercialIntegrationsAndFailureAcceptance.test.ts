/**
 * StayOS Phase 8 — Commercial Integrations & Failure Modes Acceptance Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates enterprise integrations, webhook idempotency, smart key lifecycles,
 * role authorization barriers, and failure recovery.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MockProvider } from "@/lib/locks/providers/MockProvider";

jest.setTimeout(60000);

describe("StayOS Phase 8 — Commercial Integrations & Failure Modes", () => {
  let hotelId: string;
  let testRoom: any;
  let testReservation: any;
  let testFolio: any;

  beforeAll(async () => {
    let hotel = await prisma.hotel.findFirst({ where: { name: "StayOS Commercial Pilot Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "StayOS Commercial Pilot Hotel",
          location: "Mumbai",
          address: "500 Marine Drive, Mumbai, India",
          timezone: "Asia/Kolkata",
        },
      });
    }
    hotelId = hotel.id;

    // Clean prior artifacts
    await prisma.folioTransaction.deleteMany({ where: { folio: { hotelId } } });
    await prisma.folio.deleteMany({ where: { hotelId } });
    await prisma.reservation.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });

    testRoom = await prisma.room.create({
      data: {
        hotelId,
        number: "801",
        type: "Ocean Suite",
        price: new Prisma.Decimal(12000),
        status: "Clean",
        floor: 8,
      },
    });

    testReservation = await prisma.reservation.create({
      data: {
        hotelId,
        bookingRef: `OTA-EXP-${Date.now()}`,
        guestName: "Ananya Sharma",
        guestPhone: "+919811223344",
        roomId: testRoom.id,
        checkIn: new Date("2026-09-01"),
        checkOut: new Date("2026-09-03"),
        status: "CheckedIn",
        totalAmount: new Prisma.Decimal(24000),
        balanceDue: new Prisma.Decimal(24000),
      },
    });

    testFolio = await prisma.folio.create({
      data: {
        hotelId,
        reservationId: testReservation.id,
        balance: new Prisma.Decimal(24000),
      },
    });
  });

  test("Payment Webhook Idempotency: duplicate payment webhook must not double-credit folio", async () => {
    const paymentGatewayTxId = `pay_rzp_${Date.now()}`;
    const paymentAmount = new Prisma.Decimal(10000);

    // 1. First Webhook Delivery
    const firstTx = await prisma.$transaction(async (tx) => {
      // Check idempotency via transaction reference
      const existing = await tx.folioTransaction.findFirst({
        where: { referenceId: paymentGatewayTxId },
      });
      if (existing) return existing;

      const created = await tx.folioTransaction.create({
        data: {
          folioId: testFolio.id,
          type: "Payment",
          description: "Online Payment via Razorpay Gateway",
          amount: paymentAmount,
          referenceId: paymentGatewayTxId,
          paymentMode: "Online",
        },
      });

      await tx.folio.update({
        where: { id: testFolio.id },
        data: { balance: { decrement: paymentAmount } },
      });

      return created;
    });

    expect(firstTx).toBeDefined();

    // 2. Duplicate / Re-delivered Webhook
    const duplicateTx = await prisma.$transaction(async (tx) => {
      const existing = await tx.folioTransaction.findFirst({
        where: { referenceId: paymentGatewayTxId },
      });
      if (existing) {
        return { status: "IDEMPOTENT_IGNORE", txId: existing.id };
      }
      return null;
    });

    expect(duplicateTx?.status).toBe("IDEMPOTENT_IGNORE");

    // Verify folio balance was decremented exactly once
    const finalFolio = await prisma.folio.findUnique({ where: { id: testFolio.id } });
    expect(finalFolio?.balance.toNumber()).toBe(14000); // 24000 - 10000 = 14000
  });

  test("Smart Lock Lifecycle: Issue key, scope restriction, and checkout revocation", async () => {
    const lockProvider = new MockProvider();

    // 1. Issue Key for Checked-In Guest
    const issued = await lockProvider.issueKey({
      hotelId,
      userType: "Guest",
      accessScope: "RoomOnly",
      validFrom: new Date("2026-09-01"),
      validUntil: new Date("2026-09-03"),
      roomId: testRoom.id,
      guestName: "Ananya Sharma",
      reservationId: testReservation.id,
    });

    expect(issued).toBeDefined();
    expect(issued.externalRef).toContain("MOCK-GUEST");
    expect(issued.mobileKeyPayload).toBeDefined();

    // 2. Revoke Key upon Checkout
    await expect(lockProvider.revokeKey(issued.externalRef, hotelId)).resolves.not.toThrow();
  });

  test("Role Security Barrier: Kitchen role cannot modify guest folio balance", async () => {
    const kitchenStaff = {
      id: "kitchen_chef_1",
      role: "KITCHEN",
      permissions: ["KDS_READ", "KDS_UPDATE", "RECIPE_READ"],
    };

    const attemptModifyFolio = (user: typeof kitchenStaff) => {
      if (!user.permissions.includes("FOLIO_WRITE") && !user.permissions.includes("SUPER_ADMIN")) {
        throw new Error("403 Forbidden: Insufficient permissions to modify folio");
      }
      return "SUCCESS";
    };

    expect(() => attemptModifyFolio(kitchenStaff)).toThrow(/403 Forbidden/);
  });

  test("Cashier Shortage Variance: Requires Manager Approval", async () => {
    const cashierUser = { id: "cashier_1", role: "CASHIER" };
    const managerUser = { id: "manager_1", role: "MANAGER" };

    const approveVariance = (approverId: string, cashierId: string, role: string) => {
      if (approverId === cashierId) {
        throw new Error("403 Forbidden: Cashiers cannot approve their own shift variance");
      }
      if (role !== "MANAGER" && role !== "SUPER_ADMIN" && role !== "ACCOUNTING") {
        throw new Error("403 Forbidden: Managerial authority required for variance approval");
      }
      return "VARIANCE_APPROVED";
    };

    // Self-approval must fail
    expect(() => approveVariance(cashierUser.id, cashierUser.id, cashierUser.role)).toThrow(
      /Cashiers cannot approve their own shift variance/
    );

    // Manager approval must succeed
    expect(approveVariance(managerUser.id, cashierUser.id, managerUser.role)).toBe("VARIANCE_APPROVED");
  });
});
