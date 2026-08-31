import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, mobile, phone, email, eventId, company, designation } = body;

        if (!name || (!mobile && !phone) || !eventId) {
            return NextResponse.json({ error: 'Name, phone/mobile, and eventId are required' }, { status: 400 });
        }

        const guest = await prisma.corporateGuest.create({
            data: {
                name,
                phone: phone || mobile,
                email: email || null,
                eventId,
                company: company || null,
                designation: designation || null,
            }
        });

        return NextResponse.json({ guest }, { status: 201 });
    } catch (err) {
        console.error('POST /api/guests error:', err);
        return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 });
    }
}
