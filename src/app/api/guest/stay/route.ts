import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";

export async function GET() {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });

    const [folios, requests, orders, amenities, amenityBookings, menuItems] = await Promise.all([
        prisma.folio.findMany({
            where: { reservationId: stay.id },
            include: { transactions: { orderBy: { postedAt: "desc" }, take: 20 } },
            orderBy: { createdAt: "asc" },
        }),
        prisma.guestRequest.findMany({
            where: { reservationId: stay.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
        prisma.posOrder.findMany({
            where: { reservationId: stay.id },
            include: { items: { include: { menuItem: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
        prisma.amenity.findMany({
            where: { hotelId: stay.hotelId },
            orderBy: { name: "asc" },
        }),
        prisma.amenityBooking.findMany({
            where: { reservationId: stay.id, status: { not: "CANCELLED" } },
            include: { amenity: true },
            orderBy: { startTime: "asc" },
        }),
        prisma.menuItem.findMany({
            where: { hotelId: stay.hotelId },
            orderBy: [{ category: "asc" }, { name: "asc" }],
        }),
    ]);

    const totalBalance = folios.reduce((sum, folio) => sum + Number(folio.balance), 0);

    return NextResponse.json({
        stay: {
            ...stay,
            folios,
            requests,
            orders,
            amenities,
            amenityBookings,
            menuItems,
            totalBalance,
            canSelfCheckIn: stay.status === "Confirmed",
            canSelfCheckOut: stay.status === "CheckedIn" && Math.abs(totalBalance) < 0.01,
            onlinePaymentsEnabled:
                process.env.NODE_ENV !== "production" ||
                process.env.PAYMENT_GATEWAY_MODE === "mock",
        },
    });
}

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });

    const { action } = await request.json();

    if (action === "check_in") {
        if (stay.status !== "Confirmed") {
            return NextResponse.json({ error: "This stay is not ready for check-in" }, { status: 422 });
        }
        if (!stay.roomId) {
            return NextResponse.json({ error: "A room must be assigned before self check-in" }, { status: 422 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const room = await tx.room.findFirst({
                where: { id: stay.roomId!, hotelId: stay.hotelId },
                select: { status: true },
            });
            if (!room || ["Occupied", "Maintenance"].includes(room.status)) {
                throw new Error("ROOM_NOT_READY");
            }

            const reservation = await tx.reservation.update({
                where: { id: stay.id },
                data: {
                    status: "CheckedIn",
                    actualCheckIn: new Date(),
                    selfCheckInAt: new Date(),
                },
            });
            await tx.room.update({ where: { id: stay.roomId! }, data: { status: "Occupied" } });

            const existingFolio = await tx.folio.findFirst({ where: { reservationId: stay.id } });
            if (!existingFolio) {
                await tx.folio.create({
                    data: {
                        hotelId: stay.hotelId,
                        reservationId: stay.id,
                        folioType: "Room",
                        balance: stay.balanceDue,
                        transactions: Number(stay.balanceDue) > 0
                            ? {
                                create: {
                                    type: "Opening",
                                    description: "Opening room balance",
                                    amount: stay.balanceDue,
                                },
                            }
                            : undefined,
                    },
                });
            }
            return reservation;
        }).catch((error: Error) => {
            if (error.message === "ROOM_NOT_READY") return null;
            throw error;
        });

        if (!result) {
            return NextResponse.json({ error: "Your room is not ready. Please contact reception." }, { status: 409 });
        }
        return NextResponse.json({ success: true, status: result.status });
    }

    if (action === "checkout") {
        if (stay.status !== "CheckedIn") {
            return NextResponse.json({ error: "Only checked-in stays can be checked out" }, { status: 422 });
        }

        const openFolios = await prisma.folio.findMany({
            where: { reservationId: stay.id, status: "Open" },
            select: { id: true, balance: true },
        });
        const outstanding = openFolios.reduce((sum, folio) => sum + Number(folio.balance), 0);
        if (Math.abs(outstanding) >= 0.01) {
            return NextResponse.json({
                error: "Please settle your outstanding balance before checkout",
                outstanding,
            }, { status: 422 });
        }

        await prisma.$transaction([
            prisma.reservation.update({
                where: { id: stay.id },
                data: {
                    status: "CheckedOut",
                    actualCheckOut: new Date(),
                    selfCheckOutAt: new Date(),
                },
            }),
            prisma.folio.updateMany({
                where: { reservationId: stay.id, status: "Open" },
                data: { status: "Closed" },
            }),
            ...(stay.roomId
                ? [prisma.room.update({ where: { id: stay.roomId }, data: { status: "Dirty" } })]
                : []),
        ]);

        return NextResponse.json({ success: true, status: "CheckedOut" });
    }

    return NextResponse.json({ error: "Unsupported stay action" }, { status: 400 });
}
