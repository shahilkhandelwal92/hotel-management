import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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
        const { name, corporateName, date, expectedCount } = body;
        let { hotelId } = body;

        if (!name || !corporateName || !date) {
            return NextResponse.json({ error: 'name, corporateName, and date are required' }, { status: 400 });
        }

        // If no hotelId in body, try to get it from the user's JWT session
        if (!hotelId) {
            try {
                const session = await getSession();
                hotelId = session?.hotelId;
            } catch { /* ignore, fallback below */ }
        }

        // Final fallback: use any existing hotel
        if (!hotelId) {
            const hotel = await prisma.hotel.findFirst({ orderBy: { createdAt: 'asc' } });
            if (!hotel) {
                return NextResponse.json({ error: 'No hotel found. Please add a hotel from the dashboard first.' }, { status: 400 });
            }
            hotelId = hotel.id;
        }

        const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const event = await prisma.corporateEvent.create({
            data: {
                name,
                corporateName,
                date: new Date(date),
                expectedCount: parseInt(String(expectedCount)) || 0,
                accessCode,
                hotelId,
            },
        });

        return NextResponse.json({ event }, { status: 201 });
    } catch (err) {
        console.error('POST /api/events error:', err);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
