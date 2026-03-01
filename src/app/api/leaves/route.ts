import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leaves?hotelId=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    try {
        const requests = await prisma.leaveRequest.findMany({
            where: hotelId ? { user: { hotelId } } : {},
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, hotelId: true } },
                leaveType: { select: { name: true } },
            },
            take: 100,
        });
        return NextResponse.json({ requests });
    } catch (err) {
        console.error('GET /api/leaves:', err);
        return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }
}

// POST /api/leaves — apply for leave
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, leaveTypeId, startDate, endDate, reason } = body;
        if (!userId || !leaveTypeId || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'All fields required' }, { status: 400 });
        }
        const req = await prisma.leaveRequest.create({
            data: {
                userId,
                leaveTypeId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'Pending',
            },
        });
        return NextResponse.json({ request: req }, { status: 201 });
    } catch (err) {
        console.error('POST /api/leaves:', err);
        return NextResponse.json({ error: 'Failed to apply leave' }, { status: 500 });
    }
}

// PATCH /api/leaves — approve/reject
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;
        if (!id || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: 'id and status (Approved/Rejected) required' }, { status: 400 });
        }
        const req = await prisma.leaveRequest.update({
            where: { id },
            data: { status },
        });
        return NextResponse.json({ request: req });
    } catch (err) {
        console.error('PATCH /api/leaves:', err);
        return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 });
    }
}
