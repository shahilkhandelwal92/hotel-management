import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { formatHotelBusinessDate, parseHotelBusinessDate, DEFAULT_HOTEL_TIMEZONE } from "@/lib/timezone";
import { Prisma } from "@prisma/client";

const NIGHT_AUDIT_ROLES = [
    "SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "ACCOUNTING", "NIGHT_AUDIT",
];

// GET – fetch night audit history for a hotel
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get("hotelId"));
    const month = searchParams.get("month"); // "YYYY-MM"

    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { timezone: true } });
    const tz = hotel?.timezone || DEFAULT_HOTEL_TIMEZONE;

    let dateFilter: Prisma.NightAuditWhereInput = {};
    if (month) {
        const [yr, mo] = month.split("-").map(Number);
        const startOfMo = parseHotelBusinessDate(`${yr}-${String(mo).padStart(2, "0")}-01`, tz);
        const nextMo = mo === 12 ? 1 : mo + 1;
        const nextYr = mo === 12 ? yr + 1 : yr;
        const startOfNextMo = parseHotelBusinessDate(`${nextYr}-${String(nextMo).padStart(2, "0")}-01`, tz);

        dateFilter = {
            auditDate: {
                gte: startOfMo,
                lt: startOfNextMo,
            },
        };
    }

    const audits = await prisma.nightAudit.findMany({
        where: { hotelId, ...dateFilter },
        orderBy: { auditDate: "desc" },
        take: 60,
    });

    return NextResponse.json({ audits });
}

// POST – execute and post the night audit for the business date
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const body = await req.json();
    const hotelId = resolveRequestedHotel(access, body.hotelId);
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: { taxConfigs: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

    const tz = hotel.timezone || DEFAULT_HOTEL_TIMEZONE;
    const businessDateStr = body.auditDate
        ? formatHotelBusinessDate(new Date(body.auditDate), tz)
        : formatHotelBusinessDate(new Date(), tz);

    const auditDate = parseHotelBusinessDate(businessDateStr, tz);

    // Business day date bounds in hotel timezone
    const dayStart = parseHotelBusinessDate(businessDateStr, tz);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Idempotency: check if Night Audit record already exists
    const existingAudit = await prisma.nightAudit.findUnique({
        where: { hotelId_auditDate: { hotelId, auditDate } },
    });

    if (existingAudit && existingAudit.isDayClosed) {
        return NextResponse.json({
            error: `Night audit for business date ${businessDateStr} is already closed.`,
            audit: existingAudit,
        }, { status: 422 });
    }

    // Execute atomic night audit transactions
    const result = await prisma.$transaction(async (tx) => {
        // Ensure NightAudit record exists to obtain audit ID for folio tracking
        let auditRecord = existingAudit;
        if (!auditRecord) {
            auditRecord = await tx.nightAudit.create({
                data: {
                    hotelId,
                    auditDate,
                    status: "Open",
                    isDayClosed: false,
                },
            });
        }

        // 1. Post daily room tariffs for in-house checked-in guests
        const checkedInReservations = await tx.reservation.findMany({
            where: {
                hotelId,
                status: "CheckedIn",
                deletedAt: null,
            },
            include: {
                room: true,
                folios: { where: { status: "Open" }, orderBy: { createdAt: "asc" } },
            },
        });

        let totalDailyRoomRevenue = new Prisma.Decimal(0);

        for (const res of checkedInReservations) {
            const masterFolio = res.folios[0];
            if (!masterFolio) continue;

            // Idempotency Check: check if room charge was already posted for this audit on this folio
            const alreadyPosted = await tx.folioTransaction.findFirst({
                where: {
                    folioId: masterFolio.id,
                    nightAuditId: auditRecord.id,
                    type: "Charge",
                },
            });

            if (!alreadyPosted) {
                // Calculate nightly room rate
                const dailyRate = res.room?.price ? new Prisma.Decimal(res.room.price) : (
                    res.baseAmount && res.checkIn && res.checkOut
                        ? new Prisma.Decimal(res.baseAmount).dividedBy(
                            Math.max(1, Math.round((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000))
                        ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
                        : new Prisma.Decimal(0)
                );

                if (dailyRate.greaterThan(0)) {
                    await tx.folioTransaction.create({
                        data: {
                            folioId: masterFolio.id,
                            type: "Charge",
                            description: `Night Audit Room Charge (${businessDateStr}) - ${res.room?.number ? `Room ${res.room.number}` : res.bookingRef}`,
                            amount: dailyRate,
                            nightAuditId: auditRecord.id,
                            postedById: session.user.id as string,
                        },
                    });

                    await tx.folio.update({
                        where: { id: masterFolio.id },
                        data: { balance: { increment: dailyRate } },
                    });

                    totalDailyRoomRevenue = totalDailyRoomRevenue.plus(dailyRate);
                }
            } else {
                totalDailyRoomRevenue = totalDailyRoomRevenue.plus(alreadyPosted.amount);
            }
        }

        // 2. Aggregate F&B revenue from POS orders created on this business date
        const posOrders = await tx.posOrder.findMany({
            where: {
                hotelId,
                createdAt: { gte: dayStart, lte: dayEnd },
                status: { not: "Cancelled" },
            },
            select: { grandTotal: true },
        });
        const fbRevenue = posOrders.reduce((sum, order) => sum.plus(new Prisma.Decimal(order.grandTotal)), new Prisma.Decimal(0));

        // 3. Aggregate Amenity revenue from bookings on this business date
        const amenityBookings = await tx.amenityBooking.findMany({
            where: {
                hotelId,
                startTime: { gte: dayStart, lte: dayEnd },
                status: { not: "Cancelled" },
            },
            select: { totalAmount: true },
        });
        const amenityRevenue = amenityBookings.reduce((sum, booking) => sum.plus(new Prisma.Decimal(booking.totalAmount)), new Prisma.Decimal(0));

        // 4. Aggregate Event revenue for this business date
        const partyBookings = await tx.partyBooking.findMany({
            where: {
                venue: { hotelId },
                eventDate: { gte: dayStart, lte: dayEnd },
                status: { not: "Cancelled" },
            },
            select: { estimatedCost: true },
        });
        const eventRevenue = partyBookings.reduce((sum, booking) => sum.plus(new Prisma.Decimal(booking.estimatedCost)), new Prisma.Decimal(0));

        // 5. Occupancy snapshot
        const totalRooms = await tx.room.count({ where: { hotelId } });
        const occupiedRooms = checkedInReservations.length;
        const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        const totalRevenue = totalDailyRoomRevenue.plus(fbRevenue).plus(amenityRevenue).plus(eventRevenue);

        // 6. Update NightAudit record with authoritative figures
        const updatedAudit = await tx.nightAudit.update({
            where: { id: auditRecord.id },
            data: {
                roomRevenue: totalDailyRoomRevenue,
                fbRevenue,
                amenityRevenue,
                eventRevenue,
                totalRevenue,
                totalRooms,
                occupiedRooms,
                occupancyPct,
            },
        });

        return updatedAudit;
    });

    await logAudit({
        hotelId,
        userId: session.user.id as string,
        module: "NightAudit",
        action: "NIGHT_AUDIT_RUN",
        entityId: result.id,
        newValue: {
            businessDate: businessDateStr,
            totalRevenue: result.totalRevenue.toString(),
            occupancyPct: result.occupancyPct,
        },
        req,
    });

    return NextResponse.json({ audit: result, businessDate: businessDateStr }, { status: 200 });
}

// PUT – close or reopen night audit
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, notes, reopenReason } = body;

    const existing = await prisma.nightAudit.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Night audit not found" }, { status: 404 });
    if (!resolveRequestedHotel(access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (action !== "close" && action !== "reopen") {
        return NextResponse.json({ error: "Invalid night audit action. Expected 'close' or 'reopen'." }, { status: 400 });
    }

    if (action === "reopen") {
        if (!access.isSuperAdmin) {
            return NextResponse.json({ error: "Only Super Admin can reopen a closed night audit" }, { status: 403 });
        }
        if (!existing.isDayClosed) {
            return NextResponse.json({ error: "Night audit is not closed" }, { status: 422 });
        }
        if (typeof reopenReason !== "string" || !reopenReason.trim()) {
            return NextResponse.json({ error: "A reopen reason is required" }, { status: 400 });
        }
    } else if (existing.isDayClosed) {
        return NextResponse.json({ error: "Night audit is already closed" }, { status: 422 });
    }

    const updateData: Prisma.NightAuditUpdateInput = action === "close"
        ? { isDayClosed: true, status: "Closed", closedAt: new Date(), closedById: session.user.id as string, notes: notes?.trim() || null }
        : { isDayClosed: false, status: "Reopened", reopenedAt: new Date(), reopenedById: session.user.id as string, reopenReason: reopenReason?.trim() || null };

    const audit = await prisma.nightAudit.update({ where: { id }, data: updateData });

    await logAudit({
        hotelId: existing.hotelId,
        userId: session.user.id as string,
        module: "NightAudit",
        action: action === "close" ? "NIGHT_AUDIT_CLOSE" : "NIGHT_AUDIT_REOPEN",
        entityId: audit.id,
        details: action === "close" ? notes : reopenReason,
        req,
    });

    return NextResponse.json({ audit });
}
