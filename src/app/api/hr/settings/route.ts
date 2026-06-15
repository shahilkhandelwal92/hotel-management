import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });

    try {
        const leaveTypes = await prisma.leaveType.findMany({
            where: { hotelId },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ leaveTypes });
    } catch (err) {
        console.error('GET /api/hr/settings error:', err);
        return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, defaultDays, hotelId } = body;

        if (!name || !defaultDays || !hotelId) {
            return NextResponse.json({ error: 'Name, defaultDays, and hotelId are required' }, { status: 400 });
        }

        const leaveType = await prisma.leaveType.create({
            data: {
                name,
                defaultDays: parseInt(String(defaultDays)),
                hotelId
            }
        });

        return NextResponse.json({ leaveType }, { status: 201 });
    } catch (err) {
        console.error('POST /api/hr/settings error:', err);
        return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 });
    }
}
