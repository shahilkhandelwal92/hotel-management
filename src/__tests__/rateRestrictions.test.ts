/**
 * Rate Restrictions & Revenue Management Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies MinLOS, Closed-to-Arrival (CTA), and Stop-Sell enforcement during reservation creation.
 */

import {
    setRateRestriction,
    validateBookingRestrictions,
} from "@/lib/revenueEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Dynamic Revenue & Rate Restriction Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("enforces MinLOS restriction when booking is shorter than required minimum", async () => {
        const peakDate = "2026-12-31";
        await setRateRestriction({
            hotelId: testHotelId,
            date: peakDate,
            minLOS: 3, // New Year's Eve 3-night minimum stay
        });

        // 1. Attempt 1-night stay on Dec 31 -> Rejected
        const check1 = await validateBookingRestrictions({
            hotelId: testHotelId,
            checkIn: "2026-12-31",
            checkOut: "2027-01-01",
        });
        expect(check1.allowed).toBe(false);
        expect(check1.reason).toContain("Minimum length of stay is 3");

        // 2. Attempt 3-night stay -> Allowed
        const check2 = await validateBookingRestrictions({
            hotelId: testHotelId,
            checkIn: "2026-12-31",
            checkOut: "2027-01-03",
        });
        expect(check2.allowed).toBe(true);
    });

    test("enforces Closed-to-Arrival (CTA) and Stop-Sell restrictions", async () => {
        const ctaDate = "2026-11-15";
        await setRateRestriction({
            hotelId: testHotelId,
            date: ctaDate,
            closedToArrival: true,
        });

        // Arrival on Nov 15 -> Rejected (CTA)
        const checkCTA = await validateBookingRestrictions({
            hotelId: testHotelId,
            checkIn: "2026-11-15",
            checkOut: "2026-11-18",
        });
        expect(checkCTA.allowed).toBe(false);
        expect(checkCTA.reason).toContain("Arrival closed (CTA)");

        // Stop Sell on Nov 20
        await setRateRestriction({
            hotelId: testHotelId,
            date: "2026-11-20",
            stopSell: true,
        });

        const checkStopSell = await validateBookingRestrictions({
            hotelId: testHotelId,
            checkIn: "2026-11-19",
            checkOut: "2026-11-22", // Covers Nov 20
        });
        expect(checkStopSell.allowed).toBe(false);
        expect(checkStopSell.reason).toContain("Stop Sell");
    });
});
