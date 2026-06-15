import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = session.roles.some((r: string) => ['SUPER_ADMIN', 'HOTEL_ADMIN', 'ACCOUNTING'].includes(r));
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    try {
        const amenity = await (prisma as any).amenity.update({
            where: { id, hotelId: session.hotelId },
            data: {
                name: body.name,
                price: parseFloat(body.price || "0"),
                pricingType: body.pricingType,
                customSlots: body.customSlots || [],
                isTaxApplicable: body.isTaxApplicable ?? true,
            }
        });
        return NextResponse.json({ success: true, amenity });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
export async function DELETE(_req: Request, { params }: { params: Params }) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = session.roles.some((r: string) => ['SUPER_ADMIN', 'HOTEL_ADMIN', 'ACCOUNTING'].includes(r));
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    try {
        await (prisma as any).amenity.delete({ where: { id, hotelId: session.hotelId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
