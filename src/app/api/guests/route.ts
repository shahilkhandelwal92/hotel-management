import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, mobile, email, eventId } = body;

        if (!name || !mobile || !eventId) {
            return NextResponse.json({ error: 'Name, mobile, and eventId are required' }, { status: 400 });
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                mobile,
                email,
                eventId,
                status: 'Pending'
            }
        });

        return NextResponse.json({ guest }, { status: 201 });
    } catch (err) {
        console.error('POST /api/guests error:', err);
        return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 });
    }
}
