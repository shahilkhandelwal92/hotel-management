/**
 * Banquet Event Order (BEO) Generator & Booking API
 * ──────────────────────────────────────────────────────────────────────
 * Exact Prisma.Decimal arithmetic, multi-tenant isolation, RBAC, and audit logs.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const EVENT_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "EVENT_MANAGER", "CORPORATE"];
const EVENT_WRITE_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "EVENT_MANAGER"];

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, EVENT_ROLES)) {
        return NextResponse.json({ error: "Event access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const booking = await prisma.partyBooking.findUnique({
        where: { id: bookingId },
        include: { venue: { include: { hotel: true } } },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Multi-tenant check
    if (!resolveRequestedHotel(access, booking.venue.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hotel = booking.venue.hotel;
    const nights = 1;

    // ── Cost breakdown with Decimal ───────────────────────────────
    const basePriceDec = new Prisma.Decimal(booking.venue.basePricePerDay);
    const decorPriceDec = new Prisma.Decimal(booking.venue.decorationPrice);
    const foodPriceDec = new Prisma.Decimal(booking.venue.foodPerPerson);

    const venueCostDec = basePriceDec.times(nights);
    const decorationCostDec = booking.decorOpted ? decorPriceDec : new Prisma.Decimal(0);
    const cateringCostDec = booking.cateringOpted ? foodPriceDec.times(booking.guestsCount) : new Prisma.Decimal(0);
    const subtotalDec = venueCostDec.plus(decorationCostDec).plus(cateringCostDec);

    // GST on banquet (12% for venue + catering)
    const gstPctDec = new Prisma.Decimal(0.12);
    const gstAmountDec = subtotalDec.times(gstPctDec).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const grandTotalDec = subtotalDec.plus(gstAmountDec);
    const estimatedCostDec = new Prisma.Decimal(booking.estimatedCost);

    const beo = {
        beoNumber: `BEO-${bookingId.slice(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        generatedBy: session.id,

        // ── Hotel Info ──────────────────────────────────────────
        hotel: {
            name: hotel.name,
            gstin: hotel.gstin ?? "—",
            address: hotel.address ?? "—",
            phone: hotel.phone ?? "—",
        },

        // ── Event Details ───────────────────────────────────────
        event: {
            type: booking.eventType,
            clientName: booking.clientName,
            clientContact: booking.clientPhone,
            eventDate: booking.eventDate,
            numberOfNights: nights,
            expectedGuests: booking.guestsCount,
            status: booking.status,
        },

        // ── Venue ───────────────────────────────────────────────
        venue: {
            name: booking.venue.name,
            capacity: booking.venue.capacity,
            setupRequired: booking.decorOpted,
        },

        // ── Services Booked ─────────────────────────────────────
        services: [
            { service: "Venue Rental", unit: `${nights} day(s)`, rate: basePriceDec.toNumber(), amount: venueCostDec.toNumber(), included: true },
            { service: "Decoration / Setup", unit: "Flat", rate: decorPriceDec.toNumber(), amount: decorationCostDec.toNumber(), included: booking.decorOpted },
            { service: "Catering", unit: `${booking.guestsCount} pax @ ₹${foodPriceDec.toString()}`, rate: foodPriceDec.toNumber(), amount: cateringCostDec.toNumber(), included: booking.cateringOpted },
        ].filter((s) => s.included),

        // ── Financial Summary ───────────────────────────────────
        financials: {
            subtotal: subtotalDec.toNumber(),
            gstPct: "12%",
            gstAmount: gstAmountDec.toNumber(),
            grandTotal: grandTotalDec.toNumber(),
            estimatedProvided: estimatedCostDec.toNumber(),
            variance: grandTotalDec.minus(estimatedCostDec).toNumber(),
        },

        // ── Special Notes ───────────────────────────────────────
        specialInstructions: [
            `Event Type: ${booking.eventType}`,
            booking.decorOpted ? "Decoration team must setup by 08:00 on event day" : null,
            booking.cateringOpted ? `Catering for ${booking.guestsCount} guests — confirm menu 48h prior` : null,
            booking.specialNotes ? `Notes: ${booking.specialNotes}` : null,
        ].filter(Boolean),

        // ── Confirmation Status ─────────────────────────────────
        confirmationStatus: booking.status,
        disclaimer: "This BEO is subject to final confirmation by the Events Manager. GST applicable as per government regulations.",
    };

    return NextResponse.json({ beo });
}

// POST – create party booking
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, EVENT_WRITE_ROLES)) {
        return NextResponse.json({ error: "Event administration access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
        venueId, clientName, guestName, clientPhone, contactMobile, clientEmail, eventType,
        startDate, eventDate, guestsCount, guestCount, decorOpted, needsDecoration,
        cateringOpted, needsCatering, specialNotes,
    } = body;

    if (!venueId) return NextResponse.json({ error: "venueId is required" }, { status: 400 });

    const venue = await prisma.eventVenue.findUnique({ where: { id: venueId } });
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

    if (!resolveRequestedHotel(access, venue.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const count = parseInt(String(guestsCount || guestCount || 10), 10);
    const hasDecor = Boolean(decorOpted || needsDecoration);
    const hasCatering = cateringOpted !== false && needsCatering !== false;

    const basePriceDec = new Prisma.Decimal(venue.basePricePerDay);
    const decorPriceDec = hasDecor ? new Prisma.Decimal(venue.decorationPrice) : new Prisma.Decimal(0);
    const cateringPriceDec = hasCatering ? new Prisma.Decimal(venue.foodPerPerson).times(count) : new Prisma.Decimal(0);
    const estimatedCostDec = basePriceDec.plus(decorPriceDec).plus(cateringPriceDec);

    const booking = await prisma.partyBooking.create({
        data: {
            venueId,
            clientName: (clientName || guestName || "Client").trim(),
            clientPhone: (clientPhone || contactMobile || "N/A").trim(),
            clientEmail: clientEmail?.trim() || null,
            eventType: (eventType || "Banquet").trim(),
            eventDate: new Date(eventDate || startDate || Date.now()),
            guestsCount: count,
            decorOpted: hasDecor,
            cateringOpted: hasCatering,
            specialNotes: specialNotes?.trim() || null,
            estimatedCost: estimatedCostDec,
            status: "Pending",
        },
        include: { venue: true },
    });

    await logAudit({
        hotelId: venue.hotelId,
        userId: session.user.id as string,
        module: "Events",
        action: "CREATE",
        entityId: booking.id,
        newValue: { clientName: booking.clientName, estimatedCost: estimatedCostDec.toString() },
        req,
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
}
