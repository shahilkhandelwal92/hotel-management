/**
 * Linen & Minibar Management Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies linen stock cycle tracking and minibar consumption folio posting.
 */

import {
    upsertLinenStock,
    createMinibarItem,
    recordMinibarConsumption,
} from "@/lib/linenMinibarEngine";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise Linen & Minibar Engine", () => {
    let testHotelId: string;
    let testRoomId: string;
    let testReservationId: string;
    let testFolioId: string;
    let testMinibarItemId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const room = await prisma.room.findFirst({ where: { hotelId: testHotelId } });
        if (!room) throw new Error("No room found");
        testRoomId = room.id;

        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Minibar Test Guest",
                guestPhone: "9777788888",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                status: "CheckedIn",
                roomId: testRoomId,
                baseAmount: new Prisma.Decimal("5000.00"),
                taxAmount: new Prisma.Decimal("600.00"),
                totalAmount: new Prisma.Decimal("5600.00"),
            },
        });
        testReservationId = res.id;

        const folio = await prisma.folio.create({
            data: {
                hotelId: testHotelId,
                reservationId: res.id,
                balance: new Prisma.Decimal("5600.00"),
                status: "Open",
            },
        });
        testFolioId = folio.id;

        const mbItem = await createMinibarItem({
            hotelId: testHotelId,
            name: "Ferrero Rocher Chocolates (4-pack)",
            code: `CHOC-${Date.now().toString().slice(-4)}`,
            price: 250,
            costPrice: 150,
            stockQty: 20,
        });
        testMinibarItemId = mbItem.id;
    });

    test("tracks multi-state linen stock (clean, dirty, laundry, damaged)", async () => {
        const stock = await upsertLinenStock({
            hotelId: testHotelId,
            name: "King Bed Luxury Sheet",
            code: `LINEN-${Date.now().toString().slice(-4)}`,
            parStock: 500,
            totalStock: 500,
            inRooms: 350,
            inLinenRoom: 50,
            inLaundry: 95,
            damaged: 5,
        });

        expect(stock.totalStock).toBe(500);
        expect(stock.inRooms).toBe(350);
        expect(stock.inLaundry).toBe(95);
        expect(stock.damaged).toBe(5);
    });

    test("records minibar consumption and automatically posts charge to guest folio", async () => {
        const minibar = await recordMinibarConsumption({
            hotelId: testHotelId,
            roomId: testRoomId,
            reservationId: testReservationId,
            minibarItemId: testMinibarItemId,
            quantity: 2,
            unitPrice: 250,
            billToFolio: true,
            inspectedById: "hk-attendant-1",
        });

        expect(minibar.quantity).toBe(2);
        expect(minibar.totalAmount.toNumber()).toBe(500);
        expect(minibar.postedToFolio).toBe(true);

        // Verify charge on folio (5600 + 500 = 6100)
        const updatedFolio = await prisma.folio.findUnique({
            where: { id: testFolioId },
            include: { transactions: true },
        });

        expect(updatedFolio?.balance.toNumber()).toBe(6100);
        expect(updatedFolio?.transactions.some((t) => t.description.includes("Ferrero Rocher"))).toBe(true);
    });
});
