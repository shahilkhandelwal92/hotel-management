import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { createPortalToken } from '@/lib/portalAuth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ accessCode: string }> }
) {
    const { accessCode } = await params;

    try {
        const event = await prisma.corporateEvent.findUnique({
            where: { accessCode: accessCode.toUpperCase() },
            select: { id: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Invalid Access Code' }, { status: 404 });
        }

        const token = await createPortalToken({ type: 'corporate', subjectId: event.id });
        const cookieStore = await cookies();
        cookieStore.set('corporate_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 12,
            path: '/',
        });

        return NextResponse.json({ eventId: event.id });
    } catch (err) {
        console.error('Verify Access Code Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
