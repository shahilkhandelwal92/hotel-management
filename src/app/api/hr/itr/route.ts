import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        const itrs = await prisma.employeeITR.findMany({
            where: userId ? { userId } : {},
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ financialYear: 'desc' }]
        });
        return NextResponse.json(itrs);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId, financialYear, documentUrl, status } = await req.json();

        const itr = await prisma.employeeITR.create({
            data: {
                userId,
                financialYear,
                documentUrl,
                status: status || "PENDING",
                filedDate: status === 'FILED' ? new Date() : null
            },
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json(itr);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
