import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/hotels — list all hotels with user+room counts
export async function GET() {
    try {
        const hotels = await prisma.hotel.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { users: true, events: true } },
            },
        });
        return NextResponse.json({ hotels });
    } catch (err) {
        console.error('GET /api/hotels error:', err);
        return NextResponse.json({ error: 'Failed to fetch hotels' }, { status: 500 });
    }
}

// POST /api/hotels — create a new hotel
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, location, roomCount, status, category, gstin, pan, checkInTime, checkOutTime } = body;

        if (!name || !location) {
            return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
        }

        const hotel = await prisma.hotel.create({
            data: {
                name,
                location,
                roomCount: roomCount ? parseInt(String(roomCount)) : 0,
                status: status || 'Active',
            },
        });

        return NextResponse.json({ hotel }, { status: 201 });
    } catch (err) {
        console.error('POST /api/hotels error:', err);
        return NextResponse.json({ error: 'Failed to create hotel' }, { status: 500 });
    }
}
