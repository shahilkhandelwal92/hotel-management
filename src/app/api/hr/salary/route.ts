import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        const salaries = await prisma.employeeSalary.findMany({
            where: userId ? { userId } : {},
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ month: 'desc' }]
        });
        return NextResponse.json(salaries);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, month, basicSalary, allowances, deductions, paymentStatus } = body;

        const netSalary = (parseFloat(basicSalary) || 0) + (parseFloat(allowances) || 0) - (parseFloat(deductions) || 0);

        const salary = await prisma.employeeSalary.create({
            data: {
                userId,
                month,
                basicSalary: parseFloat(basicSalary) || 0,
                allowances: parseFloat(allowances) || 0,
                deductions: parseFloat(deductions) || 0,
                netSalary,
                paymentStatus: paymentStatus || "UNPAID",
                paymentDate: paymentStatus === 'PAID' ? new Date() : null
            },
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json(salary);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
