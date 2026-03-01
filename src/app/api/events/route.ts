import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/events — list all events for the hotel admin
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    try {
        const events = await prisma.corporateEvent.findMany({
            where: hotelId ? { hotelId } : undefined,
            orderBy: { date: 'desc' },
            include: { _count: { select: { guests: true } }, hotel: { select: { name: true } } },
        });
        return NextResponse.json({ events });
    } catch (err) {
        console.error('GET /api/events error:', err);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

// POST /api/events — create a new corporate event
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, corporateName, date, expectedCount, hotelId } = body;

        if (!name || !corporateName || !date || !hotelId) {
            return NextResponse.json({ error: 'name, corporateName, date, hotelId are required' }, { status: 400 });
        }

        // Get the first hotel if no hotelId
        let resolvedHotelId = hotelId;
        if (!resolvedHotelId) {
            const hotel = await prisma.hotel.findFirst();
            if (!hotel) return NextResponse.json({ error: 'No hotel found' }, { status: 400 });
            resolvedHotelId = hotel.id;
        }

        const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const event = await prisma.corporateEvent.create({
            data: {
                name,
                corporateName,
                date: new Date(date),
                expectedCount: parseInt(String(expectedCount)) || 0,
                accessCode,
                hotelId: resolvedHotelId,
            },
        });

        return NextResponse.json({ event }, { status: 201 });
    } catch (err) {
        console.error('POST /api/events error:', err);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
