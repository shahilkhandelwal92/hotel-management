/**
 * Room Move Lifecycle Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies atomic room relocation, room status transitions (Dirty/Occupied),
 * room block migration, and housekeeping task generation.
 */

import { executeRoomMove } from "@/lib/roomMoveEngine";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise Room Move Engine", () => {
    let testHotelId: string;
    let roomAId: string;
    let roomBId: string;
    let testReservationId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        // Upsert 2 distinct test rooms
        const roomA = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "MOVE-101" } },
            update: { status: "Occupied" },
            create: {
                hotelId: testHotelId,
                number: "MOVE-101",
                type: "Deluxe",
                price: new Prisma.Decimal("5000.00"),
                status: "Occupied",
            },
        });
        roomAId = roomA.id;

        const roomB = await prisma.room.upsert({
            where: { hotelId_number: { hotelId: testHotelId, number: "MOVE-102" } },
            update: { status: "Vacant" },
            create: {
                hotelId: testHotelId,
                number: "MOVE-102",
                type: "Deluxe",
                price: new Prisma.Decimal("5000.00"),
                status: "Vacant",
            },
        });
        roomBId = roomB.id;

        const today = new Date();
        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Room Move Guest",
                guestPhone: "9000011111",
                checkIn: today,
                checkOut: new Date(today.getTime() + 86400000),
                status: "CheckedIn",
                roomId: roomAId,
                baseAmount: new Prisma.Decimal("5000.00"),
                taxAmount: new Prisma.Decimal("600.00"),
                totalAmount: new Prisma.Decimal("5600.00"),
            },
        });
        testReservationId = res.id;

        await prisma.roomBlock.create({
            data: {
                roomId: roomAId,
                reservationId: res.id,
                date: today,
                hotelId: testHotelId,
            },
        });

        await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res.id,
                balance: new Prisma.Decimal("5600.00"),
                status: "Open",
            },
        });
    });

    test("executes room move: room A becomes Dirty, room B becomes Occupied, and reservation updates", async () => {
        const result = await executeRoomMove({
            hotelId: testHotelId,
            reservationId: testReservationId,
            targetRoomId: roomBId,
            movedBy: "front-desk-agent-1",
            reason: "Guest requested quiet room away from elevator",
        });

        expect(result.reservation.roomId).toBe(roomBId);

        // Check room statuses
        const updatedRoomA = await prisma.room.findUnique({ where: { id: roomAId } });
        const updatedRoomB = await prisma.room.findUnique({ where: { id: roomBId } });

        expect(updatedRoomA?.status).toBe("Dirty");
        expect(updatedRoomB?.status).toBe("Occupied");

        // Verify room block was updated to room B
        const block = await prisma.roomBlock.findFirst({
            where: { reservationId: testReservationId },
        });
        expect(block?.roomId).toBe(roomBId);

        // Verify housekeeping task was dispatched for room A
        const hkTask = await prisma.housekeepingTask.findFirst({
            where: { roomId: roomAId, hotelId: testHotelId },
            orderBy: { createdAt: "desc" },
        });
        expect(hkTask).not.toBeNull();
        expect(hkTask?.notes).toContain("Turnover cleaning");
    });
});
