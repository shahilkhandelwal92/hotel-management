import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";



// ──────────────────────────────────────────────────
// Helper: Generate date range blocks for a stay
// ──────────────────────────────────────────────────
function getDateRange(checkIn: Date, checkOut: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(checkIn);
    current.setHours(0, 0, 0, 0);
    const end = new Date(checkOut);
    end.setHours(0, 0, 0, 0);
    while (current < end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// ──────────────────────────────────────────────────
// GET /api/reservations
// ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);

    // Prefer middleware-injected header (tenant isolation) over query param
    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSuperAdmin = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";

    const hotelId = isSuperAdmin
        ? searchParams.get("hotelId")        // SA can query any hotel
        : injectedHotelId;                   // staff locked to own hotel

    if (!isSuperAdmin && !hotelId) {
        return NextResponse.json({ error: "Hotel context missing" }, { status: 403 });
    }

    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const includeDeleted = searchParams.get("includeDeleted") === "true" && isSuperAdmin;

    const where: Prisma.ReservationWhereInput = { deletedAt: includeDeleted ? undefined : null };
    if (hotelId) where.hotelId = hotelId;
    if (status) where.status = status;
    if (date) {
        const d = new Date(date);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        where.checkIn = { gte: d, lt: next };
    }

    try {
        const reservations = await prisma.reservation.findMany({
            where,
            include: {
                room: { select: { number: true, type: true, floor: true } },
                guestProfile: { select: { id: true, loyaltyPoints: true, segment: true } },
                invoices: { select: { id: true, invoiceNumber: true, grandTotal: true, status: true } },
                folios: { select: { id: true, balance: true, status: true } },
            },
            orderBy: { checkIn: "asc" },
        });
        return NextResponse.json({ reservations });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/reservations  — with overlap check + RoomBlock
// ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const {
            hotelId: requestedHotelId, roomId, guestName, guestEmail, guestPhone, guestAddress,
            guestCity, guestState, guestGstin, idType, idNumber, bookingType,
            ratePlan, ratePlanId, adults, children, checkIn, checkOut, advanceDeposit,
            includesBreakfast, includesDinner, specialRequests, guestProfileId,
        } = body;

        if (!requestedHotelId || !guestName || !guestPhone || !checkIn || !checkOut) {
            return NextResponse.json({ error: "Missing required fields: hotelId, guestName, guestPhone, checkIn, checkOut" }, { status: 400 });
        }

        // Tenant guard — block cross-tenant booking
        const injectedHotelId = req.headers.get("x-hotel-id");
        const injectedRole = req.headers.get("x-user-role");
        const isSuperAdmin = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";
        if (!isSuperAdmin && (!injectedHotelId || injectedHotelId !== requestedHotelId)) {
            return NextResponse.json({ error: "Forbidden: cross-tenant booking not allowed" }, { status: 403 });
        }
        const hotelId = isSuperAdmin ? requestedHotelId : injectedHotelId;

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
            return NextResponse.json({ error: "Invalid check-in or check-out date" }, { status: 400 });
        }
        if (checkInDate >= checkOutDate) {
            return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
        }

        const adultCount = Number(adults ?? 1);
        const childCount = Number(children ?? 0);
        if (!Number.isInteger(adultCount) || adultCount < 1 || !Number.isInteger(childCount) || childCount < 0) {
            return NextResponse.json({ error: "Adults and children must be valid non-negative whole numbers" }, { status: 400 });
        }

        const deposit = Number(advanceDeposit ?? 0);
        if (!Number.isFinite(deposit) || deposit < 0) {
            return NextResponse.json({ error: "Advance deposit must be a non-negative amount" }, { status: 400 });
        }

        let room: { id: string; hotelId: string; price: number; maxOccupancy: number; status: string } | null = null;
        if (roomId) {
            room = await prisma.room.findUnique({
                where: { id: roomId },
                select: { id: true, hotelId: true, price: true, maxOccupancy: true, status: true },
            });
            if (!room || room.hotelId !== hotelId) {
                return NextResponse.json({ error: "Room not found for this hotel" }, { status: 404 });
            }
            if (room.status === "Maintenance") {
                return NextResponse.json({ error: "Room is under maintenance and cannot be booked" }, { status: 409 });
            }
            if (adultCount + childCount > room.maxOccupancy) {
                return NextResponse.json({
                    error: `Room capacity exceeded. Maximum occupancy is ${room.maxOccupancy}.`,
                }, { status: 422 });
            }
        }

        if (guestProfileId) {
            const guestProfile = await prisma.guestCRMProfile.findFirst({
                where: { id: guestProfileId, hotelId },
                select: { id: true },
            });
            if (!guestProfile) {
                return NextResponse.json({ error: "Guest profile not found for this hotel" }, { status: 404 });
            }
        }

        // ── OVERBOOKING PREVENTION: Check RoomBlock ────────────────
        if (roomId) {
            const stayDates = getDateRange(checkInDate, checkOutDate);

            const existingBlocks = await prisma.roomBlock.findMany({
                where: {
                    roomId,
                    date: { in: stayDates },
                },
            });

            if (existingBlocks.length > 0) {
                const blockedDates = existingBlocks.map(b =>
                    new Date(b.date).toLocaleDateString("en-IN")
                );
                return NextResponse.json({
                    error: `Room is already booked on: ${blockedDates.join(", ")}. Please select a different room or dates.`,
                    conflictDates: blockedDates,
                }, { status: 409 });
            }
        }

        // Fetch hotel GST config
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: { taxConfigs: { take: 1, orderBy: { createdAt: "desc" } } },
        });
        if (!hotel) {
            return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
        }

        // Get room price (apply rate plan multiplier if ratePlanId given)
        let baseAmount = 0;
        if (room) {
            const nights = Math.max(1, getDateRange(checkInDate, checkOutDate).length);
            let pricePerNight = room.price;

            // Apply rate plan multiplier
            if (ratePlanId) {
                const plan = await prisma.ratePlan.findFirst({
                    where: { id: ratePlanId, hotelId, isActive: true },
                    include: { seasonalRates: true, rules: true },
                });
                if (!plan) {
                    return NextResponse.json({ error: "Rate plan not found for this hotel" }, { status: 404 });
                }
                pricePerNight *= plan.baseMultiplier;
                const seasonal = plan.seasonalRates.find(
                    s => s.isActive && checkInDate >= s.startDate && checkInDate <= s.endDate
                );
                if (seasonal) pricePerNight *= seasonal.multiplier;
            }
            baseAmount = pricePerNight * nights;
        }

        // Calculate GST
        const taxConfig = hotel?.taxConfigs[0];
        const taxPct = (taxConfig?.roomTaxPct ?? 12) / 100;
        let taxAmount = 0;
        if (hotel?.isTaxApplicable && taxConfig?.isTaxApplicable) {
            taxAmount = baseAmount * taxPct;
        }
        const totalAmount = baseAmount + taxAmount;
        if (deposit > totalAmount) {
            return NextResponse.json({ error: "Advance deposit cannot exceed the reservation total" }, { status: 422 });
        }
        const balanceDue = totalAmount - deposit;
        const bookingRef = `BK${Date.now().toString(36).toUpperCase()}`;

        // ── ATOMIC TRANSACTION: Create reservation + blocks together ─
        const stayDates = roomId ? getDateRange(checkInDate, checkOutDate) : [];

        const reservation = await prisma.$transaction(async (tx) => {
            // Create the reservation
            const newReservation = await tx.reservation.create({
                data: {
                    bookingRef, hotelId, roomId: roomId || null,
                    guestName, guestEmail, guestPhone, guestAddress, guestCity, guestState, guestGstin,
                    idType, idNumber, bookingType: bookingType || "Individual",
                    ratePlan: ratePlan || "Standard", ratePlanId: ratePlanId || null,
                    adults: adultCount, children: childCount,
                    checkIn: checkInDate, checkOut: checkOutDate,
                    baseAmount, taxAmount, totalAmount,
                    advanceDeposit: deposit, balanceDue,
                    includesBreakfast: includesBreakfast || false,
                    includesDinner: includesDinner || false,
                    specialRequests, guestProfileId: guestProfileId || null,
                    status: "Confirmed",
                },
            });

            // Create RoomBlock entries for each night
            if (roomId && stayDates.length > 0) {
                await tx.roomBlock.createMany({
                    data: stayDates.map(date => ({
                        hotelId,
                        roomId,
                        date,
                        reservationId: newReservation.id,
                    })),
                });

                await tx.room.update({ where: { id: roomId }, data: { status: "Reserved" } });
            }

            // Create opening folio for the reservation
            const folio = await tx.folio.create({
                data: {
                    hotelId,
                    reservationId: newReservation.id,
                    folioType: "Room",
                    balance: balanceDue, // starts with balance due
                },
            });

            // Post opening folio transaction
            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Opening",
                    description: `Opening balance — ${bookingRef}`,
                    amount: balanceDue,
                    referenceId: newReservation.id,
                },
            });

            return newReservation;
        });

        // Update CRM profile stats (outside transaction — non-critical)
        if (guestProfileId) {
            await prisma.guestCRMProfile.update({
                where: { id: guestProfileId },
                data: { totalStays: { increment: 1 }, totalSpend: { increment: totalAmount } },
            });
        }

        // Audit log
        await logAudit({
            hotelId,
            userId: session.user.id as string,
            module: "Reservation",
            action: "CREATE",
            entityId: reservation.id,
            newValue: { bookingRef, guestName, checkIn, checkOut, totalAmount },
            req,
        });

        return NextResponse.json({ reservation }, { status: 201 });
    } catch (error: unknown) {
        console.error(error);
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            // Unique constraint violation on RoomBlock — race condition
            return NextResponse.json({
                error: "Room was just booked by another user. Please try again.",
            }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }
}
