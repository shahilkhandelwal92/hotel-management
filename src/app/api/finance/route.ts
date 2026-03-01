import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized access to Financials" }, { status: 403 });
        }

        const financials = await prisma.financialReport.findMany({
            include: { hotel: true },
            orderBy: { financialYear: "desc" }
        });

        // Calculate aggregates if needed, or group by FY
        const aggregated = financials.reduce((acc, curr) => {
            const fy = curr.financialYear;
            if (!acc[fy]) {
                acc[fy] = { financialYear: fy, totalRevenue: 0, totalExpenses: 0, hotelsCount: 0 };
            }
            acc[fy].totalRevenue += curr.totalRevenue;
            acc[fy].totalExpenses += curr.totalExpenses;
            acc[fy].hotelsCount += 1;
            return acc;
        }, {} as Record<string, any>);

        return NextResponse.json({
            raw: financials,
            aggregated: Object.values(aggregated)
        });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch financials" }, { status: 500 });
    }
}
