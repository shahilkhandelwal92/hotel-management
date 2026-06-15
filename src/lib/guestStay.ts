import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPortalToken } from "@/lib/portalAuth";

const RESERVATION_SUBJECT_PREFIX = "reservation:";

export function reservationPortalSubject(reservationId: string) {
    return `${RESERVATION_SUBJECT_PREFIX}${reservationId}`;
}

export async function getGuestStaySession() {
    const cookieStore = await cookies();
    const portalSession = await verifyPortalToken(
        cookieStore.get("guest_session")?.value,
        "guest",
    );

    if (!portalSession?.subjectId.startsWith(RESERVATION_SUBJECT_PREFIX)) {
        return null;
    }

    const reservationId = portalSession.subjectId.slice(RESERVATION_SUBJECT_PREFIX.length);
    if (!reservationId) return null;

    return prisma.reservation.findFirst({
        where: {
            id: reservationId,
            deletedAt: null,
            status: { notIn: ["Cancelled", "NoShow"] },
        },
        select: {
            id: true,
            hotelId: true,
            status: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            bookingRef: true,
            checkIn: true,
            checkOut: true,
            actualCheckIn: true,
            actualCheckOut: true,
            balanceDue: true,
            roomId: true,
            room: { select: { id: true, number: true, type: true, floor: true } },
            hotel: {
                select: {
                    id: true,
                    name: true,
                    location: true,
                    phone: true,
                    email: true,
                    hasInHouseRestaurant: true,
                    zomatoLink: true,
                    swiggyLink: true,
                },
            },
        },
    });
}
