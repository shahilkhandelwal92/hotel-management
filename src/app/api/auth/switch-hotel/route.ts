import { NextResponse } from 'next/server';
import { getSession, encrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { hotelId } = await request.json();
        if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

        // 1. Verify user is associated with this hotel. Global owners can
        // switch to any active property.
        const isGlobalAdmin = session.roles.some((role) => role === 'SUPER_ADMIN' || role === 'OWNER');
        if (isGlobalAdmin) {
            const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, status: 'Active' } });
            if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        } else {
            const userRole = await prisma.userRole.findFirst({
                where: {
                    userId: session.id,
                    hotelId: hotelId
                }
            });

            if (!userRole) {
                return NextResponse.json({ error: 'You are not associated with this hotel' }, { status: 403 });
            }
        }

        // 2. Load the user and issue a session scoped to the selected hotel.
        // The active hotel belongs to the session, not the shared User row.
        const updatedUser = await prisma.user.findUnique({
            where: { id: session.id },
            include: { roles: { include: { role: true } } }
        });
        if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 3. Update session cookie
        const userRoles = updatedUser.roles
            .filter((assignment) => assignment.hotelId === hotelId || assignment.hotelId === null)
            .map((assignment) => assignment.role.name);
        const newSessionData = {
            id: session.id,
            email: session.email,
            name: session.name,
            hotelId: hotelId,
            roles: userRoles,
            permissions: session.permissions,
        };

        const sessionToken = await encrypt(newSessionData);
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, user: newSessionData, token: sessionToken });

    } catch (err) {
        console.error('POST /api/auth/switch-hotel error:', err);
        return NextResponse.json({ error: 'Failed to switch hotel' }, { status: 500 });
    }
}
