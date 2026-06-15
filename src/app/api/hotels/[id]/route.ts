import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from '@/lib/apiAccess';

type Params = Promise<{ id: string }>;

// GET /api/hotels/[id]
export async function GET(req: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = getRequestAccess(req, session);
    if (!resolveRequestedHotel(access, id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id },
            include: {
                rooms: { orderBy: { price: 'desc' } },
                users: { take: 20, orderBy: { name: 'asc' } },
                events: { orderBy: { date: 'desc' }, take: 5 },
                _count: { select: { users: true, events: true } },
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
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = getRequestAccess(request, session);
    if (
        !hasAccessRole(access, ['SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN']) ||
        !resolveRequestedHotel(access, id)
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, location, roomCount, status, isTaxApplicable, hasInHouseRestaurant, zomatoLink, swiggyLink } = body;

        const hotel = await prisma.hotel.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(location && { location }),
                ...(roomCount !== undefined && { roomCount: parseInt(String(roomCount)) }),
                ...(status && { status }),
                ...(isTaxApplicable !== undefined && { isTaxApplicable: !!isTaxApplicable }),
                ...(hasInHouseRestaurant !== undefined && { hasInHouseRestaurant: !!hasInHouseRestaurant }),
                ...(zomatoLink !== undefined && { zomatoLink }),
                ...(swiggyLink !== undefined && { swiggyLink }),
            },
        });


        return NextResponse.json({ hotel });
    } catch (err) {
        console.error('PUT /api/hotels/[id] error:', err);
        return NextResponse.json({ error: 'Failed to update hotel' }, { status: 500 });
    }
}

// DELETE /api/hotels/[id]
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = getRequestAccess(req, session);
    if (!access.isSuperAdmin) {
        return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    try {
        await prisma.hotel.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/hotels/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete hotel' }, { status: 500 });
    }
}
