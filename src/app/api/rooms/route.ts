import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    const hotelId = session?.hotelId;

    if (!hotelId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rooms = await prisma.room.findMany({
            where: { hotelId },
            orderBy: { number: 'asc' }
        });
        return NextResponse.json({ rooms });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    const hotelId = session?.hotelId;

    if (!hotelId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { number, type, price, includesBreakfast, includesDinner } = body;

        const room = await prisma.room.create({
            data: {
                number,
                type,
                price: parseFloat(String(price)),
                includesBreakfast: !!includesBreakfast,
                includesDinner: !!includesDinner,
                hotelId
            }
        });

        return NextResponse.json({ room });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}
