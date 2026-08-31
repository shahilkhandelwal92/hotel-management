import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.VENUE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'venues' or 'bookings'

    try {
        if (type === "bookings") {
            const bookings = await prisma.partyBooking.findMany({
                where: { venue: { hotelId } },
                include: { venue: true },
                orderBy: { eventDate: "desc" },
            });
            return NextResponse.json({ bookings });
        } else {
            const venues = await prisma.eventVenue.findMany({
                where: { hotelId },
                orderBy: { name: "asc" },
            });
            return NextResponse.json({ venues });
        }
    } catch (err) {
        console.error("GET /api/venues error:", err);
        return NextResponse.json({ error: "Failed to fetch venue data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.VENUE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { type, ...data } = body;

        if (type === "booking") {
            const { venueId, clientName, clientPhone, clientEmail, eventType, eventDate, guestsCount, decorOpted, cateringOpted, specialNotes, estimatedCost } = data;

            if (!venueId || !clientName || !clientPhone) {
                return NextResponse.json({ error: "venueId, clientName, and clientPhone are required" }, { status: 400 });
            }

            // Verify venue belongs to this property (prevent cross-tenant booking)
            const venue = await prisma.eventVenue.findFirst({
                where: { id: venueId, hotelId },
            });
            if (!venue) {
                return NextResponse.json({ error: "Venue not found for this property" }, { status: 404 });
            }

            const costDec = new Prisma.Decimal(estimatedCost ?? 0);
            const booking = await prisma.partyBooking.create({
                data: {
                    venueId: venue.id,
                    clientName: clientName.trim(),
                    clientPhone: clientPhone.trim(),
                    clientEmail: clientEmail?.trim() || null,
                    eventType: eventType?.trim() || "Event",
                    eventDate: new Date(eventDate || Date.now()),
                    guestsCount: parseInt(String(guestsCount || "10"), 10),
                    decorOpted: Boolean(decorOpted),
                    cateringOpted: cateringOpted !== false,
                    specialNotes: specialNotes?.trim() || null,
                    estimatedCost: costDec,
                    status: "Confirmed",
                },
                include: { venue: true },
            });

            await logAudit({
                hotelId,
                userId: tenant.userId,
                module: "Events",
                action: "CREATE",
                entityId: booking.id,
                newValue: { clientName: booking.clientName, venueName: venue.name, eventDate: booking.eventDate },
                req,
            });

            return NextResponse.json({ booking }, { status: 201 });
        } else {
            const { name, capacity, basePathPerDay, basePricePerDay, decorationPrice, foodPerPerson } = data;
            const venueName = (name || "").trim();
            if (!venueName) {
                return NextResponse.json({ error: "Venue name is required" }, { status: 400 });
            }

            const basePrice = new Prisma.Decimal(basePricePerDay ?? basePathPerDay ?? 0);
            const decorPrice = new Prisma.Decimal(decorationPrice ?? 0);
            const foodPrice = new Prisma.Decimal(foodPerPerson ?? 0);

            const venue = await prisma.eventVenue.create({
                data: {
                    hotelId,
                    name: venueName,
                    capacity: parseInt(String(capacity || "50"), 10),
                    basePricePerDay: basePrice,
                    decorationPrice: decorPrice,
                    foodPerPerson: foodPrice,
                },
            });

            await logAudit({
                hotelId,
                userId: tenant.userId,
                module: "Events",
                action: "CREATE",
                entityId: venue.id,
                newValue: { name: venue.name, capacity: venue.capacity },
                req,
            });

            return NextResponse.json({ venue }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/venues error:", err);
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.VENUE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id) return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });

        // Verify party booking belongs to user's hotel (IDOR prevention)
        const existing = await prisma.partyBooking.findFirst({
            where: { id, venue: { hotelId } },
            include: { venue: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Booking not found for this property" }, { status: 404 });
        }

        const validStatuses = ["Pending", "Confirmed", "Completed", "Cancelled"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        const booking = await prisma.partyBooking.update({
            where: { id },
            data: { status },
            include: { venue: true },
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "Events",
            action: "UPDATE",
            entityId: booking.id,
            oldValue: { status: existing.status },
            newValue: { status: booking.status },
            req,
        });

        return NextResponse.json({ booking });
    } catch (err) {
        console.error("PATCH /api/venues error:", err);
        return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 });
    }
}
