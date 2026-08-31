import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    try {
        const room = await prisma.room.update({
            where: { id, hotelId: session.hotelId },
            data: {
                number: body.number,
                type: body.type,
                price: body.price !== undefined ? parseFloat(body.price) : undefined,
                status: body.status,
                floor: body.floor !== undefined ? Number(body.floor) : undefined,
                amenities: typeof body.amenities === "string" ? body.amenities : undefined,
            }
        });
        return NextResponse.json({ success: true, room });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
export async function DELETE(_req: Request, { params }: { params: Params }) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        await prisma.room.delete({ where: { id, hotelId: session.hotelId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
