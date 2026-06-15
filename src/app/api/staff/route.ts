import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from '@/lib/apiAccess';
import crypto from 'crypto';

// GET /api/staff?hotelId=xxx — list users for a hotel with their roles
export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, ['SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'MANAGER', 'HR'])) {
        return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get('hotelId'));
    if (!hotelId) return NextResponse.json({ error: 'Invalid hotel context' }, { status: 403 });

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { hotelId },
                    { roles: { some: { hotelId } } },
                ],
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                hotelId: true,
                createdAt: true,
                roles: { include: { role: { select: { name: true } } } },
            },
        });
        return NextResponse.json({ users });
    } catch (err) {
        console.error('GET /api/staff error:', err);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}

// POST /api/staff — add a staff member
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, ['SUPER_ADMIN', 'OWNER', 'HOTEL_ADMIN', 'ADMIN', 'HR'])) {
        return NextResponse.json({ error: 'Staff administration access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, email, hotelId: requestedHotelId, roleId } = body;
        const hotelId = resolveRequestedHotel(access, requestedHotelId);
        if (!name || !email || !hotelId) {
            return NextResponse.json({ error: 'Valid name, email, and hotelId are required' }, { status: 400 });
        }

        const role = roleId ? await prisma.role.findUnique({ where: { id: roleId } }) : null;
        if (roleId && !role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        if (!access.isSuperAdmin && role && ['SUPER_ADMIN', 'OWNER'].includes(role.name)) {
            return NextResponse.json({ error: 'Only a Super Admin can assign this role' }, { status: 403 });
        }

        const temporaryPassword = `Tmp@${crypto.randomBytes(9).toString('base64url')}`;
        const hashedPassword = await hashPassword(temporaryPassword);
        const user = await prisma.user.create({
            data: {
                name,
                email: String(email).trim().toLowerCase(),
                password: hashedPassword,
                hotelId,
                ...(roleId && {
                    roles: { create: { roleId, hotelId } }
                }),
            },
        });

        return NextResponse.json({
            user: { id: user.id, name: user.name, email: user.email },
            temporaryPassword,
        }, { status: 201 });
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        }
        console.error('POST /api/staff error:', error);
        return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
    }
}
