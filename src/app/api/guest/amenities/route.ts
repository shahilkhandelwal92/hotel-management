import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "Amenities can only be booked during an active checked-in stay" }, { status: 422 });
    }

    const { amenityId, startTime, endTime } = await request.json();
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!amenityId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json({ error: "Choose a valid amenity time slot" }, { status: 400 });
    }
    if (start < new Date()) {
        return NextResponse.json({ error: "Amenity booking time must be in the future" }, { status: 400 });
    }

    const amenity = await prisma.amenity.findFirst({
        where: { id: amenityId, hotelId: stay.hotelId },
    });
    if (!amenity) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    if (amenity.status === "Closed" || amenity.status === "Maintenance") {
        return NextResponse.json({ error: `Amenity is currently ${amenity.status.toLowerCase()}` }, { status: 409 });
    }

    const amountDec = amenity.pricingType === "FREE" ? new Prisma.Decimal(0) : new Prisma.Decimal(amenity.price);
    const maxCapacity = amenity.capacity ?? 1;

    try {
        const booking = await prisma.$transaction(async (tx) => {
            // Count overlapping active bookings inside the atomic transaction
            const overlappingCount = await tx.amenityBooking.count({
                where: {
                    amenityId: amenity.id,
                    hotelId: stay.hotelId,
                    status: "Confirmed",
                    startTime: { lt: end },
                    endTime: { gt: start },
                },
            });

            if (overlappingCount >= maxCapacity) {
                throw new Error("CAPACITY_EXCEEDED");
            }

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
                    totalAmount: amountDec,
                    paymentStatus: amountDec.isZero() ? "Paid" : "Unpaid",
                    status: "Confirmed",
                },
                include: { amenity: true },
            });

            if (amountDec.greaterThan(0)) {
                const folio = await tx.folio.findFirst({
                    where: { reservationId: stay.id, hotelId: stay.hotelId, status: "Open" },
                    orderBy: { createdAt: "asc" },
                });
                if (!folio) throw new Error("OPEN_FOLIO_REQUIRED");

                await tx.folioTransaction.create({
                    data: {
                        folioId: folio.id,
                        type: "Charge",
                        description: `${amenity.name} Booking (${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`,
                        amount: amountDec,
                        referenceId: created.id,
                    },
                });

                await tx.folio.update({
                    where: { id: folio.id },
                    data: { balance: { increment: amountDec } },
                });
            }

            return created;
        });

        await logAudit({
            hotelId: stay.hotelId,
            module: "Amenity",
            action: "CREATE",
            entityId: booking.id,
            newValue: { amenityName: amenity.name, totalAmount: amountDec.toString(), startTime, endTime },
            req: request,
        });

        return NextResponse.json({ booking }, { status: 201 });
    } catch (error: any) {
        if (error.message === "CAPACITY_EXCEEDED") {
            return NextResponse.json({
                error: `This amenity slot is fully booked (capacity: ${maxCapacity}). Please select another time.`,
            }, { status: 409 });
        }
        if (error.message === "OPEN_FOLIO_REQUIRED") {
            return NextResponse.json({
                error: "Your room folio is not open. Please contact the front desk.",
            }, { status: 422 });
        }
        console.error("POST /api/guest/amenities error:", error);
        return NextResponse.json({ error: "Failed to book amenity" }, { status: 500 });
    }
}
