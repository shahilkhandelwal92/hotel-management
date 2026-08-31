/**
 * No-Show Engine Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies No-Show processing, room block release, fee posting,
 * and operational status transition.
 */

import { processNoShow } from "@/lib/noShowEngine";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise No-Show Engine", () => {
    let testHotelId: string;
    let testRoomId: string;
    let testReservationId: string;
    let testFolioId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const room = await prisma.room.findFirst({ where: { hotelId: testHotelId } });
        if (!room) throw new Error("No room found");
        testRoomId = room.id;

        const today = new Date();
        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "NoShow Test Guest",
                guestPhone: "9123456789",
                checkIn: today,
                checkOut: new Date(today.getTime() + 86400000),
                status: "Confirmed",
                roomId: testRoomId,
                baseAmount: new Prisma.Decimal("4000.00"),
                taxAmount: new Prisma.Decimal("480.00"),
                totalAmount: new Prisma.Decimal("4480.00"),
            },
        });
        testReservationId = res.id;

        await prisma.roomBlock.create({
            data: {
                roomId: testRoomId,
                reservationId: res.id,
                date: today,
                hotelId: testHotelId,
            },
        });

        const folio = await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res.id,
                balance: new Prisma.Decimal("0.00"),
                status: "Open",
            },
        });
        testFolioId = folio.id;
    });

    test("processes NoShow: marks status, releases room blocks, and posts fee to folio", async () => {
        const result = await processNoShow({
            hotelId: testHotelId,
            reservationId: testReservationId,
            noShowFee: 2000,
            processedBy: "night-auditor-1",
            billToFolio: true,
        });

        expect(result.reservation.status).toBe("NoShow");
        expect(result.noShowRecord.roomReleased).toBe(true);
        expect(result.noShowRecord.feeBilled).toBe(true);
        expect(result.noShowRecord.noShowFee.toNumber()).toBe(2000);

        // Verify room block was released
        const remainingBlocks = await prisma.roomBlock.findMany({
            where: { reservationId: testReservationId },
        });
        expect(remainingBlocks.length).toBe(0);

        // Verify folio was charged the fee
        const updatedFolio = await prisma.folio.findUnique({
            where: { id: testFolioId },
            include: { transactions: true },
        });
        expect(updatedFolio?.balance.toNumber()).toBe(2000);
        expect(updatedFolio?.transactions.some((t) => t.description.includes("No-Show"))).toBe(true);
    });
});
