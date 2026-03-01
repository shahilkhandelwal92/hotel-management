import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/staff?hotelId=xxx — list users for a hotel with their roles
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    try {
        const users = await prisma.user.findMany({
            where: hotelId ? { hotelId } : undefined,
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
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, hotelId, roleId } = body;
        if (!name || !email || !hotelId) {
            return NextResponse.json({ error: 'name, email, hotelId required' }, { status: 400 });
        }

        // Generate a temp password (in real app this would be emailed)
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Welcome@123', salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                salt,
                hotelId,
                ...(roleId && {
                    roles: { create: { roleId } }
                }),
            },
        });

        return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
    } catch (err: any) {
        if (err?.code === 'P2002') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        console.error('POST /api/staff error:', err);
        return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
    }
}
