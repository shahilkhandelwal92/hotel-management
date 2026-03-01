import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/hotels/[id]
export async function GET(_req: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id },
            include: {
                rooms: { orderBy: { price: 'desc' } },
                users: { take: 20, orderBy: { name: 'asc' } },
                events: { orderBy: { date: 'desc' }, take: 5 },
                eventVenues: true,
                amenities: true,
                financialRep: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        if (!hotel) {
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }

        return NextResponse.json({ hotel });
    } catch (err) {
        console.error('GET /api/hotels/[id] error:', err);
        return NextResponse.json({ error: 'Failed to fetch hotel' }, { status: 500 });
    }
}

// PUT /api/hotels/[id]
export async function PUT(request: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { name, location, roomCount, status } = body;

        const hotel = await prisma.hotel.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(location && { location }),
                ...(roomCount !== undefined && { roomCount: parseInt(String(roomCount)) }),
                ...(status && { status }),
            },
        });

        return NextResponse.json({ hotel });
    } catch (err) {
        console.error('PUT /api/hotels/[id] error:', err);
        return NextResponse.json({ error: 'Failed to update hotel' }, { status: 500 });
    }
}

// DELETE /api/hotels/[id]
export async function DELETE(_req: Request, { params }: { params: Params }) {
    const { id } = await params;
    try {
        await prisma.hotel.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/hotels/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete hotel' }, { status: 500 });
    }
}
