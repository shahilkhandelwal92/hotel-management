import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    const hotelId = session?.hotelId;

    if (!hotelId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    const allowed = session.roles.some((r: string) => ['SUPER_ADMIN', 'HOTEL_ADMIN', 'ACCOUNTING'].includes(r));
    if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const amenities = await (prisma as any).amenity.findMany({
            where: { hotelId },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ amenities });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch amenities' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    const hotelId = session?.hotelId;

    if (!hotelId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    const allowed = session.roles.some((r: string) => ['SUPER_ADMIN', 'HOTEL_ADMIN', 'ACCOUNTING'].includes(r));
    if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, price, pricingType, isTaxApplicable, customSlots } = body;

        const amenity = await (prisma as any).amenity.create({
            data: {
                name,
                price: parseFloat(String(price || 0)),
                pricingType: pricingType || "CHARGEABLE",
                customSlots: customSlots || [],
                isTaxApplicable: isTaxApplicable ?? true,
                hotelId
            }
        });

        return NextResponse.json({ amenity });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to create amenity' }, { status: 500 });
    }
}
