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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const booking = await prisma.partyBooking.findUnique({
        where: { id: bookingId },
        include: { venue: { include: { hotel: true } } },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const hotel = booking.venue.hotel;
    const nights = 1;

    // ── Cost breakdown ────────────────────────────────────────────
    const venueCost = Number(booking.venue.basePricePerDay) * nights;
    const decorationCost = booking.decorOpted ? Number(booking.venue.decorationPrice) : 0;
    const cateringCost = booking.cateringOpted ? Number(booking.venue.foodPerPerson) * booking.guestsCount : 0;
    const subtotal = venueCost + decorationCost + cateringCost;

    // GST on banquet (12% for venue + catering)
    const gstPct = 0.12;
    const gstAmount = Math.round(subtotal * gstPct * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
    const estimatedCostNum = Number(booking.estimatedCost);

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
            { service: "Venue Rental", unit: `${nights} day(s)`, rate: Number(booking.venue.basePricePerDay), amount: venueCost, included: true },
            { service: "Decoration / Setup", unit: "Flat", rate: Number(booking.venue.decorationPrice), amount: decorationCost, included: booking.decorOpted },
            { service: "Catering", unit: `${booking.guestsCount} pax @ ₹${Number(booking.venue.foodPerPerson)}`, rate: Number(booking.venue.foodPerPerson), amount: cateringCost, included: booking.cateringOpted },
        ].filter(s => s.included),

        // ── Financial Summary ───────────────────────────────────
        financials: {
            subtotal,
            gstPct: `${gstPct * 100}%`,
            gstAmount,
            grandTotal,
            estimatedProvided: estimatedCostNum,
            variance: grandTotal - estimatedCostNum,
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

// POST – create/update party booking
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
        venueId, clientName, guestName, clientPhone, contactMobile, clientEmail, eventType,
        startDate, eventDate, guestsCount, guestCount, decorOpted, needsDecoration,
        cateringOpted, needsCatering, specialNotes
    } = body;

    const venue = await prisma.eventVenue.findUnique({ where: { id: venueId } });
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

    const count = Number(guestsCount || guestCount || 10);
    const hasDecor = Boolean(decorOpted || needsDecoration);
    const hasCatering = cateringOpted !== false && needsCatering !== false;

    const estimatedCost =
        Number(venue.basePricePerDay) +
        (hasDecor ? Number(venue.decorationPrice) : 0) +
        (hasCatering ? Number(venue.foodPerPerson) * count : 0);

    const booking = await prisma.partyBooking.create({
        data: {
            venueId,
            clientName: clientName || guestName || "Client",
            clientPhone: clientPhone || contactMobile || "N/A",
            clientEmail: clientEmail || null,
            eventType: eventType || "Banquet",
            eventDate: new Date(eventDate || startDate || Date.now()),
            guestsCount: count,
            decorOpted: hasDecor,
            cateringOpted: hasCatering,
            specialNotes: specialNotes || null,
            estimatedCost,
            status: "Pending",
        },
        include: { venue: true },
    });

    return NextResponse.json({ success: true, booking });
}
