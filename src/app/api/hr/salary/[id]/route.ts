import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { basicSalary, allowances, deductions, paymentStatus } = body;

        const updateData: any = {};
        if (basicSalary !== undefined) updateData.basicSalary = parseFloat(basicSalary);
        if (allowances !== undefined) updateData.allowances = parseFloat(allowances);
        if (deductions !== undefined) updateData.deductions = parseFloat(deductions);

        if (paymentStatus !== undefined) {
            updateData.paymentStatus = paymentStatus;
            updateData.paymentDate = paymentStatus === 'PAID' ? new Date() : null;
        }

        const existing = await prisma.employeeSalary.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const newBasic = updateData.basicSalary ?? existing.basicSalary;
        const newAllow = updateData.allowances ?? existing.allowances;
        const newDeduc = updateData.deductions ?? existing.deductions;
        updateData.netSalary = newBasic + newAllow - newDeduc;

        const salary = await prisma.employeeSalary.update({
            where: { id },
            data: updateData,
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json(salary);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        await prisma.employeeSalary.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
