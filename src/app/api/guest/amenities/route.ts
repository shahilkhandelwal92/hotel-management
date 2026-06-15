import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "Amenities can be booked after check-in" }, { status: 422 });
    }

    const { amenityId, startTime, endTime } = await request.json();
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!amenityId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json({ error: "Choose a valid amenity time slot" }, { status: 400 });
    }
    if (start < new Date()) {
        return NextResponse.json({ error: "Amenity time must be in the future" }, { status: 400 });
    }

    const amenity = await prisma.amenity.findFirst({
        where: { id: amenityId, hotelId: stay.hotelId },
    });
    if (!amenity) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });

    const overlap = await prisma.amenityBooking.findFirst({
        where: {
            amenityId,
            status: "CONFIRMED",
            startTime: { lt: end },
            endTime: { gt: start },
        },
        select: { id: true },
    });
    if (overlap) {
        return NextResponse.json({ error: "That slot was just booked. Please choose another." }, { status: 409 });
    }

    const amount = amenity.pricingType === "FREE" ? 0 : amenity.price;
    const booking = await prisma.$transaction(async (tx) => {
        const created = await tx.amenityBooking.create({
            data: {
                amenityId: amenity.id,
                hotelId: stay.hotelId,
                reservationId: stay.id,
                guestName: stay.guestName,
                guestContact: stay.guestPhone,
                roomNumber: stay.room?.number || null,
                startTime: start,
                endTime: end,
                date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())),
                totalAmount: amount,
                paymentStatus: amount === 0 ? "PAID" : "FOLIO",
                status: "CONFIRMED",
            },
            include: { amenity: true },
        });

        if (amount > 0) {
            const folio = await tx.folio.findFirst({
                where: { reservationId: stay.id, status: "Open" },
                orderBy: { createdAt: "asc" },
            });
            if (!folio) throw new Error("OPEN_FOLIO_REQUIRED");

            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Charge",
                    description: `${amenity.name} booking`,
                    amount,
                    referenceId: created.id,
                },
            });
            await tx.folio.update({
                where: { id: folio.id },
                data: { balance: { increment: amount } },
            });
        }
        return created;
    }).catch((error: Error) => {
        if (error.message === "OPEN_FOLIO_REQUIRED") return null;
        throw error;
    });

    if (!booking) {
        return NextResponse.json({ error: "Your room folio is not open. Please contact reception." }, { status: 422 });
    }
    return NextResponse.json({ booking }, { status: 201 });
}
