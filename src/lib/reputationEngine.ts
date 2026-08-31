/**
 * Enterprise Reputation, CSAT & Service Recovery Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages post-stay guest feedback surveys, Net Promoter Score (NPS),
 * and automatic service recovery ticket creation for negative sentiment.
 */

import prisma from "@/lib/prisma";

export interface SubmitFeedbackParams {
    hotelId: string;
    guestName: string;
    guestEmail?: string;
    reservationId?: string;
    rating: number; // 1 to 5
    npsScore?: number; // 0 to 10
    cleanlinessRating?: number;
    staffRating?: number;
    foodRating?: number;
    comments?: string;
}

export async function submitFeedbackSurvey(params: SubmitFeedbackParams) {
    const {
        hotelId,
        guestName,
        guestEmail,
        reservationId,
        rating,
        npsScore,
        cleanlinessRating,
        staffRating,
        foodRating,
        comments,
    } = params;

    return prisma.$transaction(async (tx) => {
        const survey = await tx.guestFeedbackSurvey.create({
            data: {
                hotelId,
                guestName,
                guestEmail: guestEmail ?? null,
                reservationId: reservationId ?? null,
                rating,
                npsScore: npsScore ?? null,
                cleanlinessRating: cleanlinessRating ?? null,
                staffRating: staffRating ?? null,
                foodRating: foodRating ?? null,
                comments: comments ?? null,
                status: rating <= 2 ? "ESCALATED" : "NEW",
            },
        });

        // Automatically create Service Recovery ticket if rating <= 2
        let recoveryTicket = null;
        if (rating <= 2) {
            recoveryTicket = await tx.serviceRecoveryTicket.create({
                data: {
                    hotelId,
                    feedbackId: survey.id,
                    issueDescription: `Low Rating (${rating}/5) Survey submitted: "${comments ?? "No comment provided"}"`,
                    status: "OPEN",
                },
            });
        }

        return { survey, recoveryTicket };
    }, { maxWait: 15000, timeout: 30000 });
}

export async function resolveServiceRecoveryTicket(params: {
    ticketId: string;
    compensationOffered: string;
    resolutionNotes: string;
}) {
    const { ticketId, compensationOffered, resolutionNotes } = params;

    return prisma.serviceRecoveryTicket.update({
        where: { id: ticketId },
        data: {
            compensationOffered,
            resolutionNotes,
            status: "RESOLVED",
            resolvedAt: new Date(),
        },
    });
}
