import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const type = searchParams.get('type'); // 'venues' or 'bookings'

    if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });

    try {
        if (type === 'bookings') {
            const bookings = await prisma.partyBooking.findMany({
                where: { venue: { hotelId } },
                include: { venue: true },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ bookings });
        } else {
            const venues = await prisma.eventVenue.findMany({
                where: { hotelId },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json({ venues });
        }
    } catch (err) {
        console.error('GET /api/venues error:', err);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { type, hotelId, ...data } = body;

        if (type === 'booking') {
            const booking = await prisma.partyBooking.create({
                data: {
                    clientName: data.clientName || data.guestName || "Client",
                    clientPhone: data.clientPhone || data.contactMobile || "N/A",
                    clientEmail: data.clientEmail || null,
                    eventType: data.eventType || "Party",
                    venueId: data.venueId,
                    eventDate: new Date(data.startDate || data.eventDate || Date.now()),
                    guestsCount: parseInt(data.guestsCount || data.guestCount || '10'),
                    decorOpted: !!(data.decorOpted || data.needsDecoration),
                    cateringOpted: !(data.cateringOpted === false || data.needsCatering === false),
                    specialNotes: data.specialNotes || null,
                    estimatedCost: parseFloat(data.estimatedCost || '0'),
                    status: 'Confirmed'
                }
            });
            return NextResponse.json({ booking }, { status: 201 });
        } else {
            const venue = await prisma.eventVenue.create({
                data: {
                    name: data.name,
                    capacity: parseInt(data.capacity || data.maxCapacity || '50'),
                    basePricePerDay: parseFloat(data.basePricePerDay || '0'),
                    decorationPrice: parseFloat(data.decorationPrice || '0'),
                    foodPerPerson: parseFloat(data.foodPerPerson || '0'),
                    hotelId
                }
            });
            return NextResponse.json({ venue }, { status: 201 });
        }
    } catch (err) {
        console.error('POST /api/venues error:', err);
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, status } = body;

        const booking = await prisma.partyBooking.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ booking });
    } catch (err) {
        console.error('PATCH /api/venues error:', err);
        return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
    }
}
