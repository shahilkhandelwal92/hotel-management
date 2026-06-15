import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const amenityId = searchParams.get('amenityId');

    try {
        const whereClause: any = { hotelId: session.hotelId };

        // Support filtering by specific date
        if (dateStr) {
            const startOfDay = new Date(dateStr);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(dateStr);
            endOfDay.setUTCHours(23, 59, 59, 999);

            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        if (amenityId) {
            whereClause.amenityId = amenityId;
        }

        const bookings = await (prisma as any).amenityBooking.findMany({
            where: whereClause,
            include: { amenity: true },
            orderBy: { startTime: 'asc' }
        });

        return NextResponse.json({ bookings });
    } catch (err) {
        console.error("Fetch amenity bookings Error:", err)
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { amenityId, guestName, guestContact, roomNumber, startTime, endTime } = body;

        if (!amenityId || !guestName || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        // Check for double bookings / slot overlaps
        const overlapping = await (prisma as any).amenityBooking.findFirst({
            where: {
                amenityId,
                status: 'CONFIRMED',
                OR: [
                    {
                        startTime: { lt: end },
                        endTime: { gt: start }
                    }
                ]
            }
        });

        if (overlapping) {
            return NextResponse.json({ error: 'Slot is already booked. Please select another time.' }, { status: 409 });
        }

        // Fetch amenity price
        const amenity = await (prisma as any).amenity.findUnique({ where: { id: amenityId } });
        if (!amenity) return NextResponse.json({ error: 'Amenity not found' }, { status: 404 });

        // Build the base date for querying easily later
        const baseDate = new Date(start);
        baseDate.setUTCHours(0, 0, 0, 0);

        const booking = await (prisma as any).amenityBooking.create({
            data: {
                amenityId,
                hotelId: session.hotelId,
                guestName,
                guestContact,
                roomNumber: roomNumber || null,
                startTime: start,
                endTime: end,
                date: baseDate,
                totalAmount: amenity.pricingType === 'FREE' ? 0 : amenity.price,
                paymentStatus: amenity.pricingType === 'FREE' ? 'PAID' : 'UNPAID', // Auto mark FREE as paid
            }
        });

        return NextResponse.json({ booking });
    } catch (err) {
        console.error("Create booking error:", err);
        return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
    }
}
