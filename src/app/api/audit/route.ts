import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const logs = await prisma.auditLog.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
            take: 100 // Last 100 actions
        });

        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
