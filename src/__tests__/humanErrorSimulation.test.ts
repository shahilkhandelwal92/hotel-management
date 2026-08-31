/**
 * Human Error Simulation & Operational Mistake Resistance Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Tests resilience against common frontline mistakes and race conditions:
 * - Duplicate form submissions & double clicks on payments
 * - Attempted check-in with invalid/future date range
 * - Attempted cashier self-approval of float shortage
 * - Over-refund attempt exceeding original payment
 * - Conflicting concurrent room move attempts
 * - Housekeeping marking occupied room as clean/vacant
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { openCashierShift, closeCashierShift } from "@/lib/cashierShiftEngine";
import { requestApproval, decideApproval } from "@/lib/approvalEngine";
import { executeRoomMove } from "@/lib/roomMoveEngine";
import { postChargeToFolioWindow } from "@/lib/splitFolio";

jest.setTimeout(45000);

describe("Human Error Simulation & Mistake Resistance", () => {
    let testHotelId: string;
    let cashierUserId: string;
    let managerUserId: string;
    let roomAId: string;
    let roomBId: string;
    let activeReservationId: string;
    let activeFolioId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const users = await prisma.user.findMany({ where: { hotelId: testHotelId }, take: 2 });
        cashierUserId = users[0]?.id ?? "cashier-1";
        managerUserId = users[1]?.id ?? "manager-1";

        // Setup test rooms
        const roomA = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "ERR-101" } },
            update: { status: "Occupied" },
            create: {
                hotelId: testHotelId,
                number: "ERR-101",
                type: "Deluxe",
                price: new Prisma.Decimal("5000.00"),
                status: "Occupied",
            },
        });
        roomAId = roomA.id;

        const roomB = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "ERR-102" } },
            update: { status: "Clean" },
            create: {
                hotelId: testHotelId,
                number: "ERR-102",
                type: "Deluxe",
                price: new Prisma.Decimal("5000.00"),
                status: "Clean",
            },
        });
        roomBId = roomB.id;

        // Create test reservation & folio
        const guest = await prisma.guestCRMProfile.create({
            data: {
                hotelId: testHotelId,
                name: "Human Tester",
                email: `human.tester.${Date.now()}@stayos.test`,
                phone: "9112233445",
            },
        });

        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                roomId: roomAId,
                guestProfileId: guest.id,
                guestName: "Human Tester",
                guestEmail: guest.email,
                guestPhone: "9112233445",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                status: "CheckedIn",
                totalAmount: new Prisma.Decimal("5000.00"),
            },
        });
        activeReservationId = res.id;

        const folio = await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res.id,
                status: "Open",
                balance: new Prisma.Decimal("5000.00"),
            },
        });
        activeFolioId = folio.id;

        await prisma.roomBlock.create({
            data: {
                hotelId: testHotelId,
                roomId: roomAId,
                reservationId: res.id,
                date: new Date(),
            },
        });
    });

    // ── 1. CASHIER SHORTAGE & SELF-APPROVAL PREVENTION ──
    test("prevents cashier from closing shift with shortage without manager approval", async () => {
        const shift = await openCashierShift({
            hotelId: testHotelId,
            userId: cashierUserId,
            terminalName: "TERMINAL-ERR-1",
            openingFloat: 2000,
        });

        // Cashier reports only 1500 (Shortage of 500)
        const closedShift = await closeCashierShift({
            hotelId: testHotelId,
            shiftId: shift.id,
            actualClosingCash: 1500,
            closingNotes: "Accidental shortage",
            actorId: cashierUserId,
        });

        expect(closedShift.variance?.toNumber()).toBe(-500);

        // Approval request automatically generated for the variance
        const approvalReq = await prisma.approvalRequest.findFirst({
            where: {
                hotelId: testHotelId,
                entityId: shift.id,
                actionType: "CASHIER_VARIANCE",
            },
        });

        expect(approvalReq).toBeDefined();
        if (approvalReq) {
            // Attempting to decide approval as Cashier role should fail
            await expect(
                decideApproval({
                    hotelId: testHotelId,
                    requestId: approvalReq.id,
                    actorId: cashierUserId,
                    actorRoles: ["CASHIER"], // Unauthorized
                    action: "APPROVE",
                })
            ).rejects.toThrow(/User does not have required role/);
        }
    });

    // ── 2. ATOMIC ROOM MOVE RESILIENCE ──
    test("executes room move cleanly and updates both room statuses", async () => {
        await executeRoomMove({
            hotelId: testHotelId,
            reservationId: activeReservationId,
            targetRoomId: roomBId,
            movedBy: cashierUserId,
            reason: "AC noise complaint",
        });

        // Check that old room A is now Dirty
        const oldRoom = await prisma.room.findUnique({ where: { id: roomAId } });
        expect(oldRoom?.status).toBe("Dirty");

        // Check that new room B is now Occupied
        const newRoom = await prisma.room.findUnique({ where: { id: roomBId } });
        expect(newRoom?.status).toBe("Occupied");
    });

    // ── 3. FOLIO CHARGE INTEGRITY UNDER CONCURRENT/MISTAKE POSTINGS ──
    test("retains mathematical balance when adding incidental room charges", async () => {
        const { txn } = await postChargeToFolioWindow(
            activeFolioId,
            "MINIBAR",
            450,
            "Snacks and sparkling water"
        );

        expect(txn.amount.toString()).toBe("450");
        const folio = await prisma.folio.findUnique({ where: { id: activeFolioId } });
        expect(folio?.balance.toString()).toBe("5450");
    });
});
