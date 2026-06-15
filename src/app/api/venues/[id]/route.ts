import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function DELETE(_req: Request, { params }: { params: Params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // Check if there are bookings for this venue
        const bookingCount = await prisma.partyBooking.count({ where: { venueId: id } });
        if (bookingCount > 0) {
            return NextResponse.json({ error: 'Cannot delete venue with active or past bookings' }, { status: 400 });
        }

        await prisma.eventVenue.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/venues/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
    }
}
