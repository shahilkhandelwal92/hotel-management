/**
 * Reputation & CSAT Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies guest survey submission, CSAT tracking, and automated service recovery tickets.
 */

import {
    submitFeedbackSurvey,
    resolveServiceRecoveryTicket,
} from "@/lib/reputationEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Reputation, CSAT & Recovery Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("submits high rating survey (5/5) without triggering recovery ticket", async () => {
        const result = await submitFeedbackSurvey({
            hotelId: testHotelId,
            guestName: "Lord Mountbatten",
            rating: 5,
            npsScore: 10,
            cleanlinessRating: 5,
            staffRating: 5,
            foodRating: 5,
            comments: "Exemplary heritage luxury stay. Will return next season.",
        });

        expect(result.survey.status).toBe("NEW");
        expect(result.recoveryTicket).toBeNull();
    });

    test("submits low rating survey (1/5), triggers automatic recovery ticket, and resolves it", async () => {
        const result = await submitFeedbackSurvey({
            hotelId: testHotelId,
            guestName: "Disappointed Guest",
            rating: 1,
            npsScore: 2,
            comments: "AC malfunctioned and noisy hallway throughout the night.",
        });

        expect(result.survey.status).toBe("ESCALATED");
        expect(result.recoveryTicket).not.toBeNull();
        expect(result.recoveryTicket?.status).toBe("OPEN");

        // Resolve ticket with compensation
        const resolved = await resolveServiceRecoveryTicket({
            ticketId: result.recoveryTicket!.id,
            compensationOffered: "20% refund + complimentary breakfast voucher",
            resolutionNotes: "Duty manager called guest personally and processed goodwill voucher",
        });

        expect(resolved.status).toBe("RESOLVED");
        expect(resolved.resolvedAt).not.toBeNull();
        expect(resolved.compensationOffered).toContain("20% refund");
    });
});
