import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getRequestAccess } from '@/lib/apiAccess';

// GET /api/hotels — list all hotels with user+room counts
export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);

    try {
        const hotels = await prisma.hotel.findMany({
            where: access.isSuperAdmin
                ? undefined
                : access.activeHotelId
                    ? { id: access.activeHotelId }
                    : { id: '__no_hotel__' },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        users: true,
                        rooms: true,
                        events: true,
                        reservations: true,
                        posOrders: true,
                    },
                },
            },
        });
        return NextResponse.json({ hotels });
    } catch (err) {
        console.error('GET /api/hotels error:', err);
        return NextResponse.json({ error: 'Failed to fetch hotels' }, { status: 500 });
    }
}

// POST /api/hotels — create a new hotel
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!access.isSuperAdmin) {
        return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, location, roomCount, status, isTaxApplicable, gstin } = body;

        if (!name || !location) {
            return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
        }

        const hotel = await prisma.hotel.create({
            data: {
                name,
                location,
                roomCount: roomCount ? parseInt(String(roomCount)) : 0,
                status: status || 'Active',
                isTaxApplicable: isTaxApplicable ?? true,
                gstin: gstin || null,
            },
        });

        return NextResponse.json({ hotel }, { status: 201 });
    } catch (err) {
        console.error('POST /api/hotels error:', err);
        return NextResponse.json({ error: 'Failed to create hotel' }, { status: 500 });
    }
}
