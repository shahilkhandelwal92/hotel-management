import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function PUT(request: Request, { params }: { params: Params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { name, mobile, email, status } = body;

        const guest = await prisma.guest.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(mobile && { mobile }),
                ...(email !== undefined && { email }),
                ...(status && { status }),
            }
        });

        return NextResponse.json({ guest });
    } catch (err) {
        console.error('PUT /api/guests/[id] error:', err);
        return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // Delete guest related data first
        await prisma.orderItem.deleteMany({ where: { order: { guestId: id } } });
        await prisma.foodOrder.deleteMany({ where: { guestId: id } });
        await prisma.guestRequest.deleteMany({ where: { guestId: id } });

        await prisma.guest.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/guests/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 });
    }
}
