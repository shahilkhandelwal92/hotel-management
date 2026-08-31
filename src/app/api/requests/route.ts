import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyPortalToken } from '@/lib/portalAuth';
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from '@/lib/apiAccess';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, [
        'SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'STAFF', 'HOUSEKEEPING',
    ])) {
        return NextResponse.json({ error: 'Service request access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get('hotelId'));
    const guestId = searchParams.get('guestId');
    if (!hotelId) return NextResponse.json({ error: 'Invalid hotel context' }, { status: 403 });

    try {
        const requests = await prisma.guestRequest.findMany({
            where: {
                ...(guestId && { guestId }),
                OR: [
                    { guest: { event: { hotelId } } },
                    { reservation: { hotelId, deletedAt: null } },
                ],
            },
            include: {
                guest: true,
                reservation: {
                    select: {
                        id: true,
                        guestName: true,
                        status: true,
                        room: { select: { number: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({
            requests: requests.map((item) => ({
                ...item,
                guest: item.guest || (item.reservation ? {
                    name: item.reservation.guestName,
                    roomNumber: item.reservation.room?.number,
                } : null),
            })),
        });
    } catch (err) {
        console.error('GET /api/requests error:', err);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { guestId, requestType, amount, details } = body;

        if (!guestId || !requestType) {
            return NextResponse.json({ error: 'guestId and requestType are required' }, { status: 400 });
        }

        const session = await getSession();
        const cookieStore = await cookies();
        const guestSession = await verifyPortalToken(
            cookieStore.get('guest_session')?.value,
            'guest',
        );
        if (!session && (!guestSession || guestSession.subjectId !== guestId)) {
            return NextResponse.json({ error: 'Unauthorized guest session' }, { status: 401 });
        }

        const numericAmount = Number(amount ?? 0);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return NextResponse.json({ error: 'Invalid request amount' }, { status: 400 });
        }

        const guestRequest = await prisma.guestRequest.create({
            data: {
                guestId,
                type: requestType || "Custom",
                details: details || requestType || "Guest Request",
                amount: numericAmount,
                status: 'Pending'
            }
        });

        return NextResponse.json({ guestRequest }, { status: 201 });
    } catch (err) {
        console.error('POST /api/requests error:', err);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}
