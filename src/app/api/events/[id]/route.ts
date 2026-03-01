import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/events/[id]
export async function GET(_req: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
        const event = await prisma.corporateEvent.findUnique({
            where: { id },
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
export async function PUT(request: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
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
export async function DELETE(_req: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
        // First delete guest food orders and requests, then guests, then event
        const guests = await prisma.guest.findMany({ where: { eventId: id }, select: { id: true } });
        const guestIds = guests.map(g => g.id);
        if (guestIds.length > 0) {
            await prisma.orderItem.deleteMany({ where: { order: { guestId: { in: guestIds } } } });
            await prisma.foodOrder.deleteMany({ where: { guestId: { in: guestIds } } });
            await prisma.guestRequest.deleteMany({ where: { guestId: { in: guestIds } } });
            await prisma.guest.deleteMany({ where: { eventId: id } });
        }
        await prisma.corporateEvent.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/events/[id]:', err);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
