import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized access to Financials" }, { status: 403 });
        }

        const financials = await prisma.financialReport.findMany({
            include: { hotel: true },
            orderBy: { createdAt: "desc" }
        });

        // Calculate aggregates grouped by month
        const aggregated = financials.reduce((acc, curr) => {
            const period = curr.month;
            if (!acc[period]) {
                acc[period] = { period, totalRevenue: 0, totalExpenses: 0, hotelsCount: 0 };
            }
            acc[period].totalRevenue += Number(curr.totalRevenue);
            acc[period].totalExpenses += Number(curr.totalExpenses);
            acc[period].hotelsCount += 1;
            return acc;
        }, {} as Record<string, { period: string; totalRevenue: number; totalExpenses: number; hotelsCount: number }>);

        return NextResponse.json({
            raw: financials,
            aggregated: Object.values(aggregated)
        });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch financials" }, { status: 500 });
    }
}
