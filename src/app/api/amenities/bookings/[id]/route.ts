import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function DELETE(req: Request, { params }: { params: Params }) {
    const session = await getSession();
    if (!session?.hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = session.roles.some((r: string) => ['SUPER_ADMIN', 'HOTEL_ADMIN', 'ACCOUNTING'].includes(r));
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    try {
        await (prisma as any).amenityBooking.delete({
            where: { id, hotelId: session.hotelId }
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Delete booking error:", err);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
