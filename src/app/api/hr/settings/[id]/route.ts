import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function DELETE(_req: Request, { params }: { params: Params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // Check if there are leave requests using this type
        const count = await prisma.leaveRequest.count({ where: { leaveTypeId: id } });
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete leave type that is in use by staff' }, { status: 400 });
        }

        await prisma.leaveType.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/hr/settings/[id] error:', err);
        return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 });
    }
}
