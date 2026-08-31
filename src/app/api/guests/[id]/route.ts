import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function PUT(request: Request, { params }: { params: Params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { name, mobile, phone, email, isSeated, company, designation } = body;

        const guest = await prisma.corporateGuest.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...((phone || mobile) && { phone: phone || mobile }),
                ...(email !== undefined && { email }),
                ...(isSeated !== undefined && { isSeated }),
                ...(company !== undefined && { company }),
                ...(designation !== undefined && { designation }),
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

        await prisma.guestRequest.deleteMany({ where: { guestId: id } });
        await prisma.corporateGuest.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/guests/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 });
    }
}
