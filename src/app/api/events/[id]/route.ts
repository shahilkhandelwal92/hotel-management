import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from '@/lib/apiAccess';

type Params = Promise<{ id: string }>;
const EVENT_ROLES = ['SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'EVENT_MANAGER', 'CORPORATE'];
const EVENT_WRITE_ROLES = ['SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'EVENT_MANAGER'];

// GET /api/events/[id]
export async function GET(req: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, EVENT_ROLES)) {
        return NextResponse.json({ error: 'Event access required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const event = await prisma.corporateEvent.findFirst({
            where: {
                id,
                ...(access.isSuperAdmin ? {} : { hotelId: access.activeHotelId ?? '__no_hotel__' }),
            },
            include: {
                guests: { orderBy: { name: 'asc' } },
                hotel: { select: { name: true, location: true } },
            },
        });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        return NextResponse.json({ event });
    } catch (err) {
        console.error('GET /api/events/[id]:', err);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}

// PUT /api/events/[id]
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, EVENT_WRITE_ROLES)) {
        return NextResponse.json({ error: 'Event administration access required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const existing = await prisma.corporateEvent.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (!resolveRequestedHotel(access, existing.hotelId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name, corporateName, date, expectedCount } = body;
        const event = await prisma.corporateEvent.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(corporateName && { corporateName }),
                ...(date && { date: new Date(date) }),
                ...(expectedCount !== undefined && { expectedCount: parseInt(String(expectedCount)) }),
            },
        });
        return NextResponse.json({ event });
    } catch (err) {
        console.error('PUT /api/events/[id]:', err);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

// DELETE /api/events/[id]
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, EVENT_WRITE_ROLES)) {
        return NextResponse.json({ error: 'Event administration access required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const existing = await prisma.corporateEvent.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (!resolveRequestedHotel(access, existing.hotelId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.corporateEvent.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/events/[id]:', err);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
