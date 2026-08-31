/**
 * Group & Room Block Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies group block allocations, rooming list pickups,
 * and automatic cutoff date release.
 */

import {
    createGroupBlock,
    addGuestToRoomingList,
    releaseUnusedGroupBlocks,
} from "@/lib/groupBlockEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Group & Room Block Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("creates group block and picks up rooms via rooming list", async () => {
        const block = await createGroupBlock({
            hotelId: testHotelId,
            groupName: "Global Tech Summit 2026",
            companyName: "Acme Corp",
            contactPerson: "Sarah Connor",
            contactEmail: "sarah@acme.com",
            contactPhone: "9876543210",
            startDate: new Date("2026-11-10"),
            endDate: new Date("2026-11-15"),
            cutoffDate: new Date("2026-11-01"),
            totalRooms: 10,
            negotiatedRate: 4500,
        });

        expect(block.status).toBe("DEFINITE");
        expect(block.totalRooms).toBe(10);
        expect(block.pickedUpRooms).toBe(0);

        // Add guest to rooming list
        const rooming = await addGuestToRoomingList({
            groupBlockId: block.id,
            guestName: "John Doe",
            guestEmail: "john@acme.com",
            roomNumber: "101",
        });

        expect(rooming.status).toBe("RESERVED");

        const updatedBlock = await prisma.groupBlock.findUnique({
            where: { id: block.id },
        });
        expect(updatedBlock?.pickedUpRooms).toBe(1);
    });

    test("releases unused rooms when cutoff date passes", async () => {
        // Create an expired group block
        const block = await createGroupBlock({
            hotelId: testHotelId,
            groupName: "Expired Workshop Block",
            contactPerson: "Bob Builder",
            contactEmail: "bob@builder.com",
            contactPhone: "9112233445",
            startDate: new Date("2026-10-10"),
            endDate: new Date("2026-10-12"),
            cutoffDate: new Date("2026-08-01"), // Passed
            totalRooms: 20,
            negotiatedRate: 3800,
        });

        // Pick up 2 rooms
        await addGuestToRoomingList({ groupBlockId: block.id, guestName: "Attendee 1" });
        await addGuestToRoomingList({ groupBlockId: block.id, guestName: "Attendee 2" });

        // Release expired blocks
        const released = await releaseUnusedGroupBlocks(testHotelId, new Date("2026-09-01"));
        expect(released.some((b) => b.id === block.id)).toBe(true);

        const updatedBlock = await prisma.groupBlock.findUnique({
            where: { id: block.id },
        });

        expect(updatedBlock?.status).toBe("RELEASED");
        expect(updatedBlock?.totalRooms).toBe(2); // Reduced to picked up rooms
    });
});
