import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true }
                                }
                            }
                        }
                    }
                },
                hotel: true
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Filter roles by the active hotelId (handle null for super admins)
        const activeHotelId = session.hotelId;
        const activeRoles = user.roles.filter((roleAssignment) =>
            roleAssignment.hotelId === activeHotelId || !roleAssignment.hotelId
        );

        const permissions = Array.from(new Set(
            activeRoles.flatMap((roleAssignment) =>
                roleAssignment.role.permissions.map((permissionAssignment) =>
                    permissionAssignment.permission.name
                )
            )
        ));

        // Check if the user is associated with multiple hotels
        const totalAssociatedHotels = Array.from(new Set(
            user.roles
                .map((roleAssignment) => roleAssignment.hotelId)
                .filter((hotelId): hotelId is string => Boolean(hotelId))
        ));
        const hasMultipleHotels = totalAssociatedHotels.length > 1;

        const activeHotel = activeHotelId
            ? await prisma.hotel.findUnique({ where: { id: activeHotelId } })
            : null;

        return NextResponse.json({
            user: { ...user, hotelId: activeHotelId, hotel: activeHotel, permissions, hasMultipleHotels }
        });
    } catch (err) {
        console.error('GET /api/auth/me error:', err);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}
