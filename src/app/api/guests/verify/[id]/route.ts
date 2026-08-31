import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { createPortalToken } from '@/lib/portalAuth';
import { reservationPortalSubject } from '@/lib/guestStay';

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;

        const reservation = await prisma.reservation.findFirst({
            where: {
                bookingRef: id,
                deletedAt: null,
                status: { notIn: ['Cancelled', 'NoShow'] },
            },
            select: {
                id: true,
                guestName: true,
                bookingRef: true,
                status: true,
                checkIn: true,
                checkOut: true,
                room: { select: { number: true, type: true } },
                hotel: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        hasInHouseRestaurant: true,
                        zomatoLink: true,
                        swiggyLink: true,
                    },
                },
            },
        });

        if (reservation) {
            const token = await createPortalToken({
                type: 'guest',
                subjectId: reservationPortalSubject(reservation.id),
            });
            const cookieStore = await cookies();
            cookieStore.set('guest_session', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 12,
                path: '/',
            });

            return NextResponse.json({ mode: 'stay', stay: reservation });
        }

        const guest = await prisma.corporateGuest.findFirst({
            where: {
                OR: [{ id }, { qrCode: id }],
            },
            select: {
                id: true,
                name: true,
                qrCode: true,
                event: {
                    select: {
                        hotel: {
                            select: {
                                id: true,
                                name: true,
                                location: true,
                                hasInHouseRestaurant: true,
                                zomatoLink: true,
                                swiggyLink: true,
                            },
                        },
                    }
                },
                requests: {
                    select: {
                        id: true,
                        type: true,
                        details: true,
                        amount: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

        const token = await createPortalToken({ type: 'guest', subjectId: guest.id });
        const cookieStore = await cookies();
        cookieStore.set('guest_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 12,
            path: '/',
        });

        return NextResponse.json({ mode: 'event', guest });
    } catch (err) {
        console.error('GET /api/guests/verify error:', err);
        return NextResponse.json({ error: 'Failed to verify guest' }, { status: 500 });
    }
}
