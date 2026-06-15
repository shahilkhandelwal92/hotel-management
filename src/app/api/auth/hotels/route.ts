import { NextResponse } from 'next/server';
import { getSession, hasAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (hasAnyRole(session, ['SUPER_ADMIN', 'OWNER'])) {
            const hotels = await prisma.hotel.findMany({
                where: { status: 'Active' },
                select: { id: true, name: true, location: true },
                orderBy: { name: 'asc' },
            });
            return NextResponse.json({ hotels });
        }

        // Get all unique hotels a user is associated with via UserRole
        const userRoles = await prisma.userRole.findMany({
            where: { userId: session.id },
            select: {
                hotel: {
                    select: {
                        id: true,
                        name: true,
                        location: true
                    }
                }
            }
        });

        // Filter out nulls (global roles) and get unique hotels
        const hotels = Array.from(new Map(
            userRoles
                .map(ur => ur.hotel)
                .filter(h => h !== null)
                .map(h => [h.id, h])
        ).values());

        return NextResponse.json({ hotels });
    } catch (err) {
        console.error('GET /api/auth/hotels error:', err);
        return NextResponse.json({ error: 'Failed to fetch hotels' }, { status: 500 });
    }
}
