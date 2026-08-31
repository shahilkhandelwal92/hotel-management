import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { formatHotelBusinessDate, DEFAULT_HOTEL_TIMEZONE } from "@/lib/timezone";

type RouteContext = { params: Promise<{ id: string }> };

function getStayDates(checkIn: Date, checkOut: Date, timezone: string = DEFAULT_HOTEL_TIMEZONE): Date[] {
    const dates: Date[] = [];
    const checkInTime = new Date(checkIn).getTime();
    const checkOutTime = new Date(checkOut).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const totalNights = Math.max(1, Math.round((checkOutTime - checkInTime) / oneDay));

    for (let i = 0; i < totalNights; i++) {
        const d = new Date(checkInTime + i * oneDay);
        dates.push(new Date(formatHotelBusinessDate(d, timezone) + "T00:00:00.000Z"));
    }

    return dates;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const auth = await requirePermission(req, PERMISSIONS.RESERVATION_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { id } = await params;

    try {
        const reservation = await prisma.reservation.findFirst({
            where: {
                id,
                deletedAt: null,
                ...(hotelId ? { hotelId } : {}),
            },
            include: {
                room: true,
                guestProfile: true,
                invoices: { include: { items: true, payments: true } },
            },
        });
        if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        return NextResponse.json({ reservation });
    } catch {
        return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { id } = await params;
    const body = await req.json();
    const { action, ...data } = body;

    // Enforce action-specific authoritative permissions
    const requiredPerm =
        action === "checkin" ? PERMISSIONS.RESERVATION_CHECKIN :
        action === "checkout" ? PERMISSIONS.RESERVATION_CHECKOUT :
        (action === "cancel" || action === "noshow") ? PERMISSIONS.RESERVATION_CANCEL :
        PERMISSIONS.RESERVATION_UPDATE;

    const auth = await requirePermission(req, requiredPerm);
    if (auth instanceof NextResponse) return auth;

    try {
        const existing = await prisma.reservation.findFirst({
            where: {
                id,
                deletedAt: null,
                ...(hotelId ? { hotelId } : {}),
            },
            include: { hotel: true },
        });
        if (!existing) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

        const hotelTimezone = existing.hotel?.timezone || DEFAULT_HOTEL_TIMEZONE;
        let reservation;

        if (action === "checkin") {
            if (existing.status !== "Confirmed") {
                return NextResponse.json({ error: `Cannot check in a ${existing.status} reservation` }, { status: 422 });
            }

            reservation = await prisma.$transaction(async (tx) => {
                if (existing.roomId) {
                    const room = await tx.room.findFirst({
                        where: { id: existing.roomId, hotelId: existing.hotelId },
                    });
                    if (!room) throw new Error("Reservation room is invalid");
                    if (room.status === "Maintenance") throw new Error("Room is under maintenance");
                    await tx.room.update({ where: { id: room.id }, data: { status: "Occupied" } });
                }

                return tx.reservation.update({
                    where: { id: existing.id },
                    data: {
                        status: "CheckedIn",
                        actualCheckIn: new Date(),
                        selfCheckInAt: body.isSelfCheckIn ? new Date() : undefined,
                    },
                });
            });

            if (existing.roomId) {
                try {
                    const provider = await getLockProvider(existing.hotelId);
                    const validUntil = new Date(existing.checkOut);
                    validUntil.setHours(11, 0, 0, 0);

                    await provider.issueKey({
                        hotelId: existing.hotelId,
                        reservationId: existing.id,
                        userType: "Guest",
                        accessScope: "RoomOnly",
                        validFrom: new Date(),
                        validUntil,
                        guestName: existing.guestName || "Guest",
                        roomId: existing.roomId,
                    });
                } catch (accessError) {
                    console.error("Failed to auto-issue smart key:", accessError);
                }
            }
        } else if (action === "checkout") {
            if (existing.status !== "CheckedIn") {
                return NextResponse.json({ error: `Cannot check out a ${existing.status} reservation` }, { status: 422 });
            }

            reservation = await prisma.$transaction(async (tx) => {
                if (existing.roomId) {
                    const room = await tx.room.findFirst({
                        where: { id: existing.roomId, hotelId: existing.hotelId },
                    });
                    if (!room) throw new Error("Reservation room is invalid");

                    await tx.room.update({ where: { id: room.id }, data: { status: "Dirty" } });
                    await tx.housekeepingTask.create({
                        data: {
                            hotelId: existing.hotelId,
                            roomId: room.id,
                            roomNumber: room.number,
                            taskType: "Clean",
                            priority: "High",
                            status: "Pending",
                            checklist: [
                                { item: "Change bed sheets", done: false },
                                { item: "Clean bathroom", done: false },
                                { item: "Vacuum floor", done: false },
                                { item: "Replenish toiletries", done: false },
                                { item: "Check minibar", done: false },
                            ],
                        },
                    });
                }

                return tx.reservation.update({
                    where: { id: existing.id },
                    data: { status: "CheckedOut", actualCheckOut: new Date() },
                });
            });
        } else if (action === "cancel" || action === "noshow") {
            if (existing.status === "CheckedIn" || existing.status === "CheckedOut") {
                return NextResponse.json({ error: `Cannot ${action} a ${existing.status} reservation` }, { status: 422 });
            }

            reservation = await prisma.$transaction(async (tx) => {
                await tx.roomBlock.deleteMany({ where: { reservationId: existing.id } });

                if (existing.roomId) {
                    const room = await tx.room.findFirst({
                        where: { id: existing.roomId, hotelId: existing.hotelId },
                    });
                    if (room && room.status !== "Occupied") {
                        await tx.room.update({ where: { id: room.id }, data: { status: "Vacant" } });
                    }
                }

                return tx.reservation.update({
                    where: { id: existing.id },
                    data: { status: action === "cancel" ? "Cancelled" : "NoShow" },
                });
            });
        } else {
            const nextRoomId = data.roomId === undefined ? existing.roomId : (data.roomId || null);
            const deposit = data.advanceDeposit === undefined
                ? Number(existing.advanceDeposit)
                : Number(data.advanceDeposit);

            if (!Number.isFinite(deposit) || deposit < 0 || deposit > Number(existing.totalAmount)) {
                return NextResponse.json({ error: "Invalid advance deposit" }, { status: 422 });
            }

            if (nextRoomId) {
                const room = await prisma.room.findFirst({
                    where: { id: nextRoomId, hotelId: existing.hotelId },
                });
                if (!room) return NextResponse.json({ error: "Room not found for this hotel" }, { status: 404 });
                if (room.status === "Maintenance") {
                    return NextResponse.json({ error: "Room is under maintenance" }, { status: 409 });
                }
            }

            reservation = await prisma.$transaction(async (tx) => {
                if (nextRoomId !== existing.roomId) {
                    await tx.roomBlock.deleteMany({ where: { reservationId: existing.id } });

                    if (nextRoomId) {
                        const stayDates = getStayDates(existing.checkIn, existing.checkOut, hotelTimezone);
                        await tx.roomBlock.createMany({
                            data: stayDates.map((date) => ({
                                hotelId: existing.hotelId,
                                roomId: nextRoomId,
                                reservationId: existing.id,
                                date,
                            })),
                        });
                        await tx.room.update({ where: { id: nextRoomId }, data: { status: "Reserved" } });
                    }

                    if (existing.roomId) {
                        const oldRoom = await tx.room.findUnique({ where: { id: existing.roomId } });
                        if (oldRoom && oldRoom.status !== "Occupied") {
                            await tx.room.update({ where: { id: oldRoom.id }, data: { status: "Vacant" } });
                        }
                    }
                }

                return tx.reservation.update({
                    where: { id: existing.id },
                    data: {
                        guestName: data.guestName,
                        guestEmail: data.guestEmail,
                        guestPhone: data.guestPhone,
                        specialRequests: data.specialRequests,
                        ratePlan: data.ratePlan,
                        includesBreakfast: data.includesBreakfast,
                        includesDinner: data.includesDinner,
                        advanceDeposit: deposit,
                        balanceDue: Number(existing.totalAmount) - deposit,
                        roomId: nextRoomId,
                    },
                });
            });
        }

        const auditAction =
            action === "checkin" ? "CHECKIN" :
            action === "checkout" ? "CHECKOUT" :
            action === "cancel" ? "CANCEL" :
            "UPDATE";

        await logAudit({
            hotelId: existing.hotelId,
            userId: auth.userId,
            module: "Reservation",
            action: auditAction,
            entityId: existing.id,
            oldValue: { status: existing.status, roomId: existing.roomId, balanceDue: existing.balanceDue },
            newValue: { status: reservation.status, roomId: reservation.roomId, balanceDue: reservation.balanceDue },
            req,
        });

        return NextResponse.json({ reservation });
    } catch (error: unknown) {
        console.error(error);
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return NextResponse.json({ error: "Room is already booked for one or more stay dates" }, { status: 409 });
        }
        const message = error instanceof Error ? error.message : "Failed to update reservation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const auth = await requirePermission(req, PERMISSIONS.RESERVATION_CANCEL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { id } = await params;

    try {
        const existing = await prisma.reservation.findFirst({
            where: {
                id,
                deletedAt: null,
                ...(hotelId ? { hotelId } : {}),
            },
        });
        if (!existing) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        if (existing.status === "CheckedIn") {
            return NextResponse.json({ error: "Checked-in reservations cannot be deleted" }, { status: 422 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.roomBlock.deleteMany({ where: { reservationId: existing.id } });
            await tx.reservation.update({
                where: { id: existing.id },
                data: { deletedAt: new Date(), status: "Cancelled" },
            });
            if (existing.roomId) {
                const room = await tx.room.findUnique({ where: { id: existing.roomId } });
                if (room && room.status !== "Occupied") {
                    await tx.room.update({ where: { id: room.id }, data: { status: "Vacant" } });
                }
            }
        });

        await logAudit({
            hotelId: existing.hotelId,
            userId: auth.userId,
            module: "Reservation",
            action: "DELETE",
            entityId: existing.id,
            oldValue: { bookingRef: existing.bookingRef, status: existing.status },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 });
    }
}
