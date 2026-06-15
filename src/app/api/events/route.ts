import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from '@/lib/apiAccess';
import crypto from 'crypto';

// GET /api/events — list all events for the hotel admin
export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, [
        'SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'EVENT_MANAGER', 'CORPORATE',
    ])) {
        return NextResponse.json({ error: 'Event access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get('hotelId'));
    if (!hotelId) return NextResponse.json({ error: 'Invalid hotel context' }, { status: 403 });

    try {
        const events = await prisma.corporateEvent.findMany({
            where: { hotelId },
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
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, [
        'SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'EVENT_MANAGER',
    ])) {
        return NextResponse.json({ error: 'Event administration access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, corporateName, date, expectedCount } = body;
        const hotelId = resolveRequestedHotel(access, body.hotelId);

        if (!name || !corporateName || !date || !hotelId) {
            return NextResponse.json({ error: 'name, corporateName, date, and valid hotel context are required' }, { status: 400 });
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
