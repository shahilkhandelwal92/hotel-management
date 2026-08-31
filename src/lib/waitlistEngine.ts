/**
 * Enterprise Reservation Waitlist Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages guest priority waitlists for sold-out room dates and automated
 * conversion when cancellations occur.
 */

import prisma from "@/lib/prisma";

export interface CreateWaitlistParams {
    hotelId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    roomCategoryId?: string;
    arrivalDate: Date | string;
    departureDate: Date | string;
    numberOfRooms?: number;
    priority?: number;
    notes?: string;
}

export async function createWaitlistEntry(params: CreateWaitlistParams) {
    const {
        hotelId,
        guestName,
        guestPhone,
        guestEmail,
        roomCategoryId,
        arrivalDate,
        departureDate,
        numberOfRooms = 1,
        priority = 1,
        notes,
    } = params;

    return prisma.reservationWaitlist.create({
        data: {
            hotelId,
            guestName,
            guestPhone,
            guestEmail: guestEmail ?? null,
            roomCategoryId: roomCategoryId ?? null,
            arrivalDate: new Date(arrivalDate),
            departureDate: new Date(departureDate),
            numberOfRooms,
            priority,
            status: "ACTIVE",
            notes: notes ?? null,
        },
    });
}

export async function convertWaitlistToReservation(waitlistId: string, reservationId: string) {
    return prisma.reservationWaitlist.update({
        where: { id: waitlistId },
        data: {
            status: "CONVERTED",
            convertedResId: reservationId,
        },
    });
}
