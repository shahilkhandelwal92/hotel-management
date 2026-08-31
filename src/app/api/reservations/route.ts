import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { resolveTenantContext } from "@/lib/tenantContext";
import { calculateReservationPrice } from "@/domains/pricing/pricingService";
import { formatHotelBusinessDate } from "@/lib/timezone";

// Helper to expand dates between checkIn and checkOut
function getDateRange(start: Date, end: Date, timeZone?: string): Date[] {
    const dates: Date[] = [];
    const inStr = formatHotelBusinessDate(start, timeZone);
    const outStr = formatHotelBusinessDate(end, timeZone);

    const curr = new Date(`${inStr}T00:00:00Z`);
    const last = new Date(`${outStr}T00:00:00Z`);

    while (curr < last) {
        dates.push(new Date(curr));
        curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
}

export async function GET(req: NextRequest) {
    const permResult = await requirePermission(req, PERMISSIONS.RESERVATION_VIEW);
    if ("errorResponse" in permResult) return permResult.errorResponse;

    const tenantResult = await resolveTenantContext(req);
    if (!tenantResult.success) return tenantResult.response;

    const { searchParams } = new URL(req.url);
    const hotelId = tenantResult.context.hotelId;
    const status = searchParams.get("status");
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const search = searchParams.get("search");

    const where: any = { hotelId, deletedAt: null };

    if (status) where.status = status;
    if (checkIn && checkOut) {
        where.checkIn = { gte: new Date(checkIn) };
        where.checkOut = { lte: new Date(checkOut) };
    }
    if (search) {
        where.OR = [
            { guestName: { contains: search, mode: "insensitive" } },
            { guestPhone: { contains: search } },
            { guestEmail: { contains: search, mode: "insensitive" } },
            { bookingRef: { contains: search, mode: "insensitive" } },
        ];
    }

    const reservations = await prisma.reservation.findMany({
        where,
        include: {
            room: { select: { number: true, type: true, floor: true } },
            guestProfile: { select: { id: true, name: true, phone: true } },
            folios: { select: { id: true, balance: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
    const permResult = await requirePermission(req, PERMISSIONS.RESERVATION_CREATE);
    if ("errorResponse" in permResult) return permResult.errorResponse;

    const body = await req.json();
    const {
        hotelId: requestedHotelId,
        roomId,
        guestName,
        guestEmail,
        guestPhone,
        guestAddress,
        guestCity,
        guestState,
        guestGstin,
        idType,
        idNumber,
        bookingType,
        ratePlan,
        ratePlanId,
        adults,
        children,
        checkIn,
        checkOut,
        advanceDeposit,
        includesBreakfast,
        includesDinner,
        specialRequests,
        guestProfileId,
    } = body;

    if (!requestedHotelId || !guestName || !guestPhone || !checkIn || !checkOut) {
        return NextResponse.json(
            { error: "Missing required fields: hotelId, guestName, guestPhone, checkIn, checkOut" },
            { status: 400 }
        );
    }

    const tenantResult = await resolveTenantContext(req, requestedHotelId);
    if (!tenantResult.success) return tenantResult.response;
    const hotelId = tenantResult.context.hotelId;

    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: { taxConfigs: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    if (!hotel) {
        return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

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
        return NextResponse.json({ error: "Adults and children must be valid non-negative numbers" }, { status: 400 });
    }

    const deposit = Number(advanceDeposit ?? 0);
    if (!Number.isFinite(deposit) || deposit < 0) {
        return NextResponse.json({ error: "Advance deposit must be a non-negative amount" }, { status: 400 });
    }

    let room: { id: string; hotelId: string; price: any; status: string } | null = null;
    if (roomId) {
        room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true, hotelId: true, price: true, status: true },
        });

        if (!room || room.hotelId !== hotelId) {
            return NextResponse.json({ error: "Room not found for this property" }, { status: 404 });
        }
        if (room.status === "Maintenance" || room.status === "OutOfService") {
            return NextResponse.json({ error: "Room is under maintenance and cannot be booked" }, { status: 409 });
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

    // ── Load Rate Plan if specified ──
    let loadedPlan: any = null;
    if (ratePlanId) {
        loadedPlan = await prisma.ratePlan.findFirst({
            where: { id: ratePlanId, hotelId, isActive: true },
            include: { rules: true, seasonalRates: true },
        });
        if (!loadedPlan) {
            return NextResponse.json({ error: "Rate plan not found or inactive" }, { status: 404 });
        }
    }

    // ── Central Domain Pricing Engine ──
    const roomBasePrice = room ? Number(room.price) : 0;
    const taxConfig = hotel.taxConfigs[0];
    const taxRatePct = hotel.isTaxApplicable && taxConfig?.isTaxApplicable ? (taxConfig.roomTaxPct || 12) : 0;

    const pricing = calculateReservationPrice({
        baseRoomPrice: roomBasePrice,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: adultCount,
        children: childCount,
        ratePlan: loadedPlan,
        taxRatePct,
        isTaxIncluded: hotel.isTaxIncluded,
    });

    if (deposit > pricing.totalAmount) {
        return NextResponse.json({ error: "Advance deposit cannot exceed the reservation total" }, { status: 422 });
    }

    const balanceDue = pricing.totalAmount - deposit;
    const bookingRef = `BK${Date.now().toString(36).toUpperCase()}`;
    const stayDates = roomId ? getDateRange(checkInDate, checkOutDate, hotel.timezone) : [];

    // ── ATOMIC TRANSACTION: Check RoomBlock + Create Reservation + Blocks + Folio ──
    try {
        const reservation = await prisma.$transaction(async (tx) => {
            if (roomId && stayDates.length > 0) {
                // Check blocks inside transaction
                const existingBlocks = await tx.roomBlock.findMany({
                    where: {
                        roomId,
                        date: { in: stayDates },
                    },
                });

                if (existingBlocks.length > 0) {
                    const conflictDates = existingBlocks.map((b) => b.date.toISOString().slice(0, 10));
                    throw new Error(`OVERBOOK_CONFLICT:${conflictDates.join(", ")}`);
                }
            }

            // 1. Create Reservation
            const newRes = await tx.reservation.create({
                data: {
                    bookingRef,
                    hotelId,
                    roomId: roomId || null,
                    guestName,
                    guestEmail,
                    guestPhone,
                    guestAddress,
                    guestCity,
                    guestState,
                    guestGstin,
                    idType,
                    idNumber,
                    bookingType: bookingType || "Individual",
                    ratePlan: loadedPlan?.name || ratePlan || "Standard",
                    ratePlanId: ratePlanId || null,
                    adults: adultCount,
                    children: childCount,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    baseAmount: pricing.baseAmount,
                    taxAmount: pricing.taxAmount,
                    totalAmount: pricing.totalAmount,
                    advanceDeposit: deposit,
                    balanceDue,
                    includesBreakfast: includesBreakfast || false,
                    includesDinner: includesDinner || false,
                    specialRequests,
                    guestProfileId: guestProfileId || null,
                    status: "Confirmed",
                },
            });

            // 2. Allocate RoomBlocks
            if (roomId && stayDates.length > 0) {
                for (const date of stayDates) {
                    await tx.roomBlock.create({
                        data: {
                            hotelId,
                            roomId,
                            date,
                            reservationId: newRes.id,
                        },
                    });
                }
            }

            // 3. Initialize Master Folio
            const folio = await tx.folio.create({
                data: {
                    hotelId,
                    reservationId: newRes.id,
                    folioType: "Room",
                    balance: pricing.totalAmount,
                    status: "Open",
                },
            });

            // 4. Post Opening Room Charge
            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Charge",
                    description: `Room Tariff (${pricing.nights} nights) - ${bookingRef}`,
                    amount: pricing.totalAmount,
                    postedById: permResult.auth.userId,
                },
            });

            // 5. If advance deposit paid, post credit transaction
            if (deposit > 0) {
                await tx.folioTransaction.create({
                    data: {
                        folioId: folio.id,
                        type: "Payment",
                        description: `Advance Deposit Received - ${bookingRef}`,
                        amount: -deposit,
                        postedById: permResult.auth.userId,
                    },
                });

                await tx.folio.update({
                    where: { id: folio.id },
                    data: { balance: balanceDue },
                });
            }

            return newRes;
        });

        return NextResponse.json(reservation, { status: 201 });
    } catch (err: any) {
        if (err.message?.startsWith("OVERBOOK_CONFLICT:")) {
            const conflictDates = err.message.replace("OVERBOOK_CONFLICT:", "").split(", ");
            return NextResponse.json(
                {
                    error: `Room is already booked on: ${conflictDates.join(", ")}. Please select a different room or dates.`,
                    conflictDates,
                },
                { status: 409 }
            );
        }
        console.error("Error creating reservation:", err);
        return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }
}
