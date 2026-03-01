import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const userRoles = user.roles.map(r => r.role.name);

        const sessionData = {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: userRoles,
            hotelId: user.hotelId
        };

        const sessionToken = await encrypt(sessionData);

        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        return NextResponse.json({ success: true, user: sessionData });
    } catch (error) {
        logger.error('Login error', { error: (error as Error).message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
