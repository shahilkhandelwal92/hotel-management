/**
 * Banquet Event Order (BEO) Generator
 * GET /api/events/beo?bookingId=<partyBookingId>
 * Returns a structured JSON "BEO document" for printing
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";



export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const booking = await prisma.partyBooking.findUnique({
        where: { id: bookingId },
        include: { venue: { include: { hotel: true } } },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const hotel = booking.venue.hotel;
    const nights = Math.max(1, Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000
    ));

    // ── Cost breakdown ────────────────────────────────────────────
    const venueCost = booking.venue.basePricePerDay * nights;
    const decorationCost = booking.needsDecoration ? booking.venue.decorationPrice : 0;
    const cateringCost = booking.needsCatering ? booking.venue.foodPerPerson * booking.guestCount : 0;
    const subtotal = venueCost + decorationCost + cateringCost;

    // GST on banquet (12% for venue + catering)
    const gstPct = 0.12;
    const gstAmount = subtotal * gstPct;
    const grandTotal = subtotal + gstAmount;

    const beo = {
        beoNumber: `BEO-${bookingId.slice(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.id,

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
            clientName: booking.guestName,
            clientContact: booking.contactMobile,
            clientState: booking.state,
            startDate: booking.startDate,
            endDate: booking.endDate,
            numberOfNights: nights,
            expectedGuests: booking.guestCount,
            status: booking.status,
        },

        // ── Venue ───────────────────────────────────────────────
        venue: {
            name: booking.venue.name,
            maxCapacity: booking.venue.maxCapacity,
            setupRequired: booking.needsDecoration,
        },

        // ── Services Booked ─────────────────────────────────────
        services: [
            { service: "Venue Rental", unit: `${nights} day(s)`, rate: booking.venue.basePricePerDay, amount: venueCost, included: true },
            { service: "Decoration / Setup", unit: "Flat", rate: booking.venue.decorationPrice, amount: decorationCost, included: booking.needsDecoration },
            { service: "Catering", unit: `${booking.guestCount} pax @ ₹${booking.venue.foodPerPerson}`, rate: booking.venue.foodPerPerson, amount: cateringCost, included: booking.needsCatering },
            { service: "Room Booking", unit: `${booking.roomsRequested} rooms`, rate: 0, amount: 0, included: booking.needsRooms, note: "Linked to PMS reservations" },
        ].filter(s => s.included),

        // ── Financial Summary ───────────────────────────────────
        financials: {
            subtotal,
            gstPct: `${gstPct * 100}%`,
            gstAmount,
            grandTotal,
            estimatedProvided: booking.estimatedCost,
            variance: grandTotal - booking.estimatedCost,
        },

        // ── Special Notes ───────────────────────────────────────
        specialInstructions: [
            `Event Type: ${booking.eventType}`,
            booking.needsRooms ? `Rooms Requested: ${booking.roomsRequested} (coordinate with Front Desk)` : null,
            booking.needsDecoration ? "Decoration team must setup by 08:00 on event day" : null,
            booking.needsCatering ? `Catering for ${booking.guestCount} guests — confirm menu 48h prior` : null,
            `Client state for GST: ${booking.state ?? "Not specified"}`,
        ].filter(Boolean),

        // ── Confirmation Status ─────────────────────────────────
        confirmationStatus: booking.status,
        disclaimer: "This BEO is subject to final confirmation by the Events Manager. GST applicable as per government regulations.",
    };

    return NextResponse.json({ beo });
}

// POST – create/update party booking
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
        venueId, guestName, contactMobile, state, country = "India", eventType,
        startDate, endDate, guestCount, needsDecoration, needsCatering, needsRooms, roomsRequested = 0,
    } = body;

    const venue = await prisma.eventVenue.findUnique({ where: { id: venueId } });
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

    const nights = Math.max(1, Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ));
    const estimatedCost =
        venue.basePricePerDay * nights +
        (needsDecoration ? venue.decorationPrice : 0) +
        (needsCatering ? venue.foodPerPerson * guestCount : 0);

    const booking = await prisma.partyBooking.create({
        data: {
            venueId, guestName, contactMobile, state, country, eventType,
            startDate: new Date(startDate), endDate: new Date(endDate),
            guestCount, needsDecoration, needsCatering, needsRooms, roomsRequested,
            estimatedCost, status: "Pending",
        },
        include: { venue: true },
    });

    return NextResponse.json({ booking }, { status: 201 });
}

// PUT – confirm/cancel booking
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status } = await req.json();
    const booking = await prisma.partyBooking.update({
        where: { id },
        data: { status },
    });
    return NextResponse.json({ booking });
}
