import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/attendance?hotelId=xxx&date=YYYY-MM-DD
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const dateStr = searchParams.get('date');

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const users = await prisma.user.findMany({
            where: hotelId ? { hotelId } : {},
            include: {
                roles: { include: { role: { select: { name: true } } } },
                attendances: {
                    where: { date: { gte: startOfDay, lte: endOfDay } },
                    take: 1,
                },
            },
            take: 100,
        });

        const records = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            role: u.roles?.[0]?.role?.name ?? 'Staff',
            checkIn: u.attendances?.[0]?.checkIn ? new Date(u.attendances[0].checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--',
            checkOut: u.attendances?.[0]?.checkOut ? new Date(u.attendances[0].checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--',
            status: u.attendances?.[0]?.status ?? 'Absent',
            attendanceId: u.attendances?.[0]?.id ?? null,
        }));

        return NextResponse.json({ records, date: targetDate.toISOString() });
    } catch (err) {
        console.error('GET /api/attendance:', err);
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }
}

// POST /api/attendance — mark or update attendance
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, status, checkIn, checkOut } = body;
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const record = await prisma.attendance.upsert({
            where: { userId_date: { userId, date: today } },
            create: {
                userId,
                date: today,
                status: status ?? 'Present',
                checkIn: checkIn ? new Date(checkIn) : new Date(),
            },
            update: {
                status: status ?? 'Present',
                ...(checkIn && { checkIn: new Date(checkIn) }),
                ...(checkOut && { checkOut: new Date(checkOut) }),
            },
        });

        return NextResponse.json({ record });
    } catch (err) {
        console.error('POST /api/attendance:', err);
        return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
    }
}
