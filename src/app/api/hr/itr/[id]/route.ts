import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const { documentUrl, status } = await req.json();

        const updateData: any = {};
        if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
        if (status !== undefined) {
            updateData.status = status;
            updateData.filedDate = status === 'FILED' ? new Date() : null;
        }

        const itr = await prisma.employeeITR.update({
            where: { id },
            data: updateData,
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json(itr);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        await prisma.employeeITR.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
