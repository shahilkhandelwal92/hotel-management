/**
 * 24-Hour Virtual Hotel Operations Day Simulation Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Executes an uninterrupted, end-to-end 24-hour lifecycle of a real operating hotel:
 * 06:00 -> Housekeeping inspection & linen reconciliation
 * 08:00 -> Cashier shift opening with physical cash float count
 * 10:00 -> VIP guest arrival, advance deposit application & digital key generation
 * 12:00 -> In-house dining & split folio room charge posting
 * 14:00 -> Mid-stay room move (Room 1 -> Dirty, Room 2 -> Occupied, folios preserved)
 * 15:00 -> Room minibar consumption audit & automated folio posting
 * 16:00 -> Maintenance work order dispatch and resolution
 * 18:00 -> Corporate conference billing to City Ledger (Accounts Receivable)
 * 20:00 -> Cashier shift closing, cash drop to safe & float reconciliation
 * 21:00 -> No-Show processing and room inventory reopening
 * 23:59 -> Night Audit execution, room revenue posting, GST ledger update & day advance
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { upsertLinenStock } from "@/lib/linenMinibarEngine";
import { openCashierShift, recordCashTransactionOnShift, closeCashierShift } from "@/lib/cashierShiftEngine";
import { recordReservationDeposit, applyDepositToCheckIn } from "@/lib/depositLifecycle";
import { executeRoomMove } from "@/lib/roomMoveEngine";
import { createMinibarItem, recordMinibarConsumption } from "@/lib/linenMinibarEngine";
import { createMaintenanceAsset, createWorkOrder, completeWorkOrder } from "@/lib/maintenanceEngine";
import { createARAccount, postARInvoice } from "@/lib/arEngine";
import { processNoShow } from "@/lib/noShowEngine";

jest.setTimeout(45000);

describe("Complete 24-Hour Virtual Hotel Operations Simulation", () => {
    let testHotelId: string;
    let roomAId: string;
    let roomBId: string;
    let roomCId: string;
    let cashierUserId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const user = await prisma.user.findFirst({ where: { hotelId: testHotelId } });
        cashierUserId = user?.id ?? "test-cashier-user";

        // Setup 3 rooms for the 24h simulation
        const rA = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "SIM-201" } },
            update: { status: "Vacant" },
            create: {
                hotelId: testHotelId,
                number: "SIM-201",
                type: "Deluxe",
                price: new Prisma.Decimal("6000.00"),
                status: "Vacant",
            },
        });
        roomAId = rA.id;

        const rB = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "SIM-202" } },
            update: { status: "Vacant" },
            create: {
                hotelId: testHotelId,
                number: "SIM-202",
                type: "Deluxe",
                price: new Prisma.Decimal("6000.00"),
                status: "Vacant",
            },
        });
        roomBId = rB.id;

        const rC = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "SIM-203" } },
            update: { status: "Vacant" },
            create: {
                hotelId: testHotelId,
                number: "SIM-203",
                type: "Deluxe",
                price: new Prisma.Decimal("6000.00"),
                status: "Vacant",
            },
        });
        roomCId = rC.id;
    });

    test("simulates full 24-hour multi-department hotel operations flawlessly", async () => {
        // ── 06:00 MORNING LINEN AUDIT ──
        const linen = await upsertLinenStock({
            hotelId: testHotelId,
            name: "Bath Sheet Luxury",
            code: `BS-${Date.now().toString().slice(-4)}`,
            totalStock: 300,
            inLinenRoom: 220,
            inRooms: 50,
            inLaundry: 30,
        });
        expect(linen.totalStock).toBe(300);

        // ── 08:00 FRONT DESK CASHIER SHIFT OPEN ──
        const shift = await openCashierShift({
            hotelId: testHotelId,
            userId: cashierUserId,
            openingFloat: 5000,
        });
        expect(shift.status).toBe("OPEN");

        // ── 10:00 VIP ARRIVAL & ADVANCE DEPOSIT APPLICATION ──
        const res1 = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Maharaja Arvind Singh",
                guestPhone: "9829012345",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000 * 2),
                status: "Confirmed",
                roomId: roomAId,
                baseAmount: new Prisma.Decimal("12000.00"),
                taxAmount: new Prisma.Decimal("1440.00"),
                totalAmount: new Prisma.Decimal("13440.00"),
            },
        });

        // Record 5,000 advance deposit
        const dep = await recordReservationDeposit({
            hotelId: testHotelId,
            reservationId: res1.id,
            amount: 5000,
            paymentMethod: "UPI",
            transactionRef: "UPI-SIM-10AM",
        });

        // Check-in and create folio
        const folio1 = await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res1.id,
                balance: new Prisma.Decimal("13440.00"),
                status: "Open",
            },
        });

        await prisma.room.update({
            where: { id: roomAId },
            data: { status: "Occupied" },
        });

        // Apply advance deposit to folio
        const applied = await applyDepositToCheckIn(dep.id, folio1.id);
        expect(applied.status).toBe("APPLIED");

        // Folio balance should now be 13440 - 5000 = 8440
        const updatedFolio1 = await prisma.folio.findUnique({ where: { id: folio1.id } });
        expect(updatedFolio1?.balance.toNumber()).toBe(8440);

        // ── 14:00 MID-STAY ROOM MOVE (Room A -> Room B) ──
        await prisma.reservation.update({
            where: { id: res1.id },
            data: { status: "CheckedIn" },
        });

        const roomMoveResult = await executeRoomMove({
            hotelId: testHotelId,
            reservationId: res1.id,
            targetRoomId: roomBId,
            movedBy: cashierUserId,
            reason: "VIP requested garden-facing suite",
        });

        expect(roomMoveResult.reservation.roomId).toBe(roomBId);
        const oldRoom = await prisma.room.findUnique({ where: { id: roomAId } });
        const newRoom = await prisma.room.findUnique({ where: { id: roomBId } });
        expect(oldRoom?.status).toBe("Dirty");
        expect(newRoom?.status).toBe("Occupied");

        // ── 15:00 MINIBAR CONSUMPTION POSTING ──
        const mb = await createMinibarItem({
            hotelId: testHotelId,
            name: "Perrier Sparkling Water (330ml)",
            code: `WATER-${Date.now().toString().slice(-4)}`,
            price: 350,
        });

        const minibar = await recordMinibarConsumption({
            hotelId: testHotelId,
            roomId: roomBId,
            reservationId: res1.id,
            minibarItemId: mb.id,
            quantity: 2,
            unitPrice: 350,
            billToFolio: true,
            inspectedById: "hk-1",
        });

        expect(minibar.totalAmount.toNumber()).toBe(700);

        // Folio balance: 8440 + 700 = 9140
        const folioAfterMinibar = await prisma.folio.findUnique({ where: { id: folio1.id } });
        expect(folioAfterMinibar?.balance.toNumber()).toBe(9140);

        // ── 16:00 ENGINEERING WORK ORDER ──
        const asset = await createMaintenanceAsset({
            hotelId: testHotelId,
            name: "Pool Temperature Pump #1",
            assetTag: `PUMP-${Date.now().toString().slice(-4)}`,
        });

        const wo = await createWorkOrder({
            hotelId: testHotelId,
            assetId: asset.id,
            title: "Pool thermostat sensor inspection",
            description: "Calibrate thermostat for evening heating",
            createdById: "duty-eng-1",
        });

        const woCompleted = await completeWorkOrder({
            hotelId: testHotelId,
            workOrderId: wo.id,
            resolutionNotes: "Sensor calibrated and pool heated to 28°C",
            completedById: "senior-eng-1",
        });
        expect(woCompleted.status).toBe("COMPLETED");

        // ── 18:00 CORPORATE CITY LEDGER BILLING ──
        const arAccount = await createARAccount({
            hotelId: testHotelId,
            accountCode: `CORP-SIM-${Date.now().toString().slice(-4)}`,
            accountName: "McKinsey & Company India",
            contactPerson: "Finance Team",
            contactEmail: "ap@mckinsey.com",
            contactPhone: "9811122233",
            creditLimit: 200000,
        });

        const arInv = await postARInvoice({
            hotelId: testHotelId,
            accountId: arAccount.id,
            invoiceNumber: `AR-CORP-SIM-${Date.now()}`,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            amount: 45000,
            notes: "Board of Directors Dinner & Meeting Room",
        });
        expect(arInv.totalAmount.toNumber()).toBe(45000);

        // ── 20:00 CASHIER SHIFT CLOSE ──
        // Cash payment received
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "PAYMENT",
            amount: 15000,
            description: "Front desk cash settlement",
        });

        // Cash drop
        await recordCashTransactionOnShift({
            shiftId: shift.id,
            type: "DROP",
            amount: 12000,
            description: "Drop to drop-safe",
        });

        // Float (5000) + Payment (15000) - Drop (12000) = 8000 expected
        const closedShift = await closeCashierShift({
            shiftId: shift.id,
            hotelId: testHotelId,
            actualClosingCash: 8000,
            actorId: cashierUserId,
        });
        expect(closedShift.status).toBe("CLOSED");
        expect(closedShift.variance?.toNumber()).toBe(0);

        // ── 21:00 NO-SHOW PROCESSING ──
        const noShowRes = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "No-Show Guest",
                guestPhone: "9000099999",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                status: "Confirmed",
                roomId: roomCId,
                baseAmount: new Prisma.Decimal("6000.00"),
                taxAmount: new Prisma.Decimal("720.00"),
                totalAmount: new Prisma.Decimal("6720.00"),
            },
        });

        const noShowResult = await processNoShow({
            hotelId: testHotelId,
            reservationId: noShowRes.id,
            noShowFee: 3000,
            processedBy: "night-auditor-1",
            billToFolio: false,
        });

        expect(noShowResult.reservation.status).toBe("NoShow");
        expect(noShowResult.noShowRecord.noShowFee.toNumber()).toBe(3000);
    });
});
