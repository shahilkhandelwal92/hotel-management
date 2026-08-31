/**
 * Waitlist Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies priority waitlist creation and reservation conversion.
 */

import { createWaitlistEntry, convertWaitlistToReservation } from "@/lib/waitlistEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Reservation Waitlist Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("creates active waitlist entries with custom priority", async () => {
        const entry = await createWaitlistEntry({
            hotelId: testHotelId,
            guestName: "Waitlist VIP Guest",
            guestPhone: "9876500000",
            guestEmail: "vip@guest.com",
            arrivalDate: new Date("2026-10-01"),
            departureDate: new Date("2026-10-04"),
            numberOfRooms: 2,
            priority: 5,
            notes: "Member of Chairman's Club",
        });

        expect(entry.status).toBe("ACTIVE");
        expect(entry.priority).toBe(5);
        expect(entry.numberOfRooms).toBe(2);
    });

    test("converts waitlist to confirmed reservation when room opens", async () => {
        const entry = await createWaitlistEntry({
            hotelId: testHotelId,
            guestName: "Converting Guest",
            guestPhone: "9876511111",
            arrivalDate: new Date("2026-11-01"),
            departureDate: new Date("2026-11-03"),
        });

        const converted = await convertWaitlistToReservation(entry.id, "res-converted-123");
        expect(converted.status).toBe("CONVERTED");
        expect(converted.convertedResId).toBe("res-converted-123");
    });
});
