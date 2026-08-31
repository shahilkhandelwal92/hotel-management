/**
 * Split Folio & Window Routing Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies multi-window folio creation, category routing rules,
 * and inter-window balance transfers.
 */

import {
    createFolioWindow,
    configureRoutingRule,
    postChargeToFolioWindow,
    transferBetweenFolioWindows,
} from "@/lib/splitFolio";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise Split Folio & Routing Engine", () => {
    let testHotelId: string;
    let testFolioId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const room = await prisma.room.findFirst({ where: { hotelId: testHotelId } });
        const res = await prisma.reservation.create({
            data: {
                hotelId: testHotelId,
                guestName: "Split Folio Guest",
                guestPhone: "9988776655",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                status: "CheckedIn",
                roomId: room?.id,
                baseAmount: new Prisma.Decimal("5000.00"),
                taxAmount: new Prisma.Decimal("600.00"),
                totalAmount: new Prisma.Decimal("5600.00"),
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

    test("creates Window 1 (Company Master) and Window 2 (Personal)", async () => {
        const window1 = await createFolioWindow({
            folioId: testFolioId,
            windowNumber: 1,
            name: "Company Master",
            payerType: "COMPANY",
        });

        const window2 = await createFolioWindow({
            folioId: testFolioId,
            windowNumber: 2,
            name: "Guest Personal",
            payerType: "GUEST",
        });

        expect(window1.windowNumber).toBe(1);
        expect(window2.windowNumber).toBe(2);
        expect(window1.payerType).toBe("COMPANY");
        expect(window2.payerType).toBe("GUEST");
    });

    test("routes ROOM_CHARGE to Window 1 and FOOD_BEVERAGE to Window 2", async () => {
        const window1 = await prisma.folioWindow.findFirst({
            where: { folioId: testFolioId, windowNumber: 1 },
        });
        const window2 = await prisma.folioWindow.findFirst({
            where: { folioId: testFolioId, windowNumber: 2 },
        });

        if (!window1 || !window2) throw new Error("Windows not found");

        await configureRoutingRule({
            folioId: testFolioId,
            targetWindowId: window1.id,
            chargeCategory: "ROOM_CHARGE",
        });

        await configureRoutingRule({
            folioId: testFolioId,
            targetWindowId: window2.id,
            chargeCategory: "FOOD_BEVERAGE",
        });

        // Post Room Charge
        await postChargeToFolioWindow(testFolioId, "ROOM_CHARGE", 5000, "Nightly Room Rate");
        // Post F&B Charge
        await postChargeToFolioWindow(testFolioId, "FOOD_BEVERAGE", 1200, "Restaurant Dinner");

        const updatedW1 = await prisma.folioWindow.findUnique({ where: { id: window1.id } });
        const updatedW2 = await prisma.folioWindow.findUnique({ where: { id: window2.id } });
        const updatedFolio = await prisma.folio.findUnique({ where: { id: testFolioId } });

        expect(updatedW1?.balance.toNumber()).toBe(5000);
        expect(updatedW2?.balance.toNumber()).toBe(1200);
        expect(updatedFolio?.balance.toNumber()).toBe(6200);
    });

    test("transfers charge between folio windows while preserving total balance", async () => {
        const window1 = await prisma.folioWindow.findFirst({
            where: { folioId: testFolioId, windowNumber: 1 },
        });
        const window2 = await prisma.folioWindow.findFirst({
            where: { folioId: testFolioId, windowNumber: 2 },
        });

        if (!window1 || !window2) throw new Error("Windows not found");

        await transferBetweenFolioWindows({
            folioId: testFolioId,
            sourceWindowId: window1.id,
            targetWindowId: window2.id,
            amount: 1000,
            reason: "Transfer meal allowance",
            actorId: "actor-1",
        });

        const updatedW1 = await prisma.folioWindow.findUnique({ where: { id: window1.id } });
        const updatedW2 = await prisma.folioWindow.findUnique({ where: { id: window2.id } });
        const updatedFolio = await prisma.folio.findUnique({ where: { id: testFolioId } });

        expect(updatedW1?.balance.toNumber()).toBe(4000);
        expect(updatedW2?.balance.toNumber()).toBe(2200);
        expect(updatedFolio?.balance.toNumber()).toBe(6200);
    });
});
