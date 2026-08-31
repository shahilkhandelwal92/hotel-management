/**
 * Channel Manager & OTA Distribution Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies OTA connection setup, room & rate mapping, sync job logging,
 * and external OTA booking ingestion into StayOS reservations.
 */

import {
    createChannelConnection,
    mapChannelRoom,
    mapChannelRate,
    syncChannelAvailabilityAndRates,
    ingestChannelReservation,
} from "@/lib/channelManagerEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Channel Manager & Distribution Engine", () => {
    let testHotelId: string;
    let testConnectionId: string;
    let testRoomCategoryId: string;
    let testRatePlanId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const category = await prisma.roomCategory.findFirst({ where: { hotelId: testHotelId } });
        testRoomCategoryId = category?.id ?? "cat-deluxe";

        const ratePlan = await prisma.ratePlan.findFirst({ where: { hotelId: testHotelId } });
        testRatePlanId = ratePlan?.id ?? "rate-plan-standard";

        const conn = await createChannelConnection({
            hotelId: testHotelId,
            channelCode: `BCOM_${Date.now().toString().slice(-4)}`,
            channelName: "Booking.com Direct XML Connect",
            hotelIdOnChannel: "BCOM-HTL-9988",
        });
        testConnectionId = conn.id;
    });

    test("maps room category and rate plan with price multiplier", async () => {
        const roomMap = await mapChannelRoom({
            connectionId: testConnectionId,
            roomCategoryId: testRoomCategoryId,
            channelRoomId: "OTA-ROOM-DLX",
            channelRoomName: "Deluxe King Room",
        });
        expect(roomMap.channelRoomId).toBe("OTA-ROOM-DLX");

        const rateMap = await mapChannelRate({
            connectionId: testConnectionId,
            ratePlanId: testRatePlanId,
            channelRateId: "OTA-RATE-BAR",
            channelRateName: "Best Available Rate (OTA)",
            multiplier: 1.15, // 15% markup on OTA
        });
        expect(rateMap.multiplier.toNumber()).toBe(1.15);
    });

    test("triggers availability and rate synchronization push job", async () => {
        const job = await syncChannelAvailabilityAndRates(testConnectionId);
        expect(job.status).toBe("SUCCESS");
        expect(job.jobType).toBe("AVAILABILITY_AND_RATE_PUSH");
    });

    test("ingests incoming OTA reservation into StayOS PMS and creates mapping", async () => {
        const bookingRef = `OTA-RES-${Date.now()}`;
        const result = await ingestChannelReservation({
            hotelId: testHotelId,
            channelCode: "BOOKING_COM",
            channelBookingId: bookingRef,
            guestName: "Samantha Miller",
            guestEmail: "samantha@booking.com",
            arrivalDate: new Date("2026-12-20"),
            departureDate: new Date("2026-12-24"),
            totalAmount: 28000,
            commissionAmount: 4200, // 15% commission
            rawPayload: { channelRef: bookingRef, paymentModel: "HOTEL_COLLECT" },
        });

        expect(result.reservation.status).toBe("Confirmed");
        expect(result.reservation.totalAmount.toNumber()).toBe(28000);
        expect(result.channelReservation.channelBookingId).toBe(bookingRef);
        expect(result.channelReservation.commissionAmount.toNumber()).toBe(4200);
    });
});
