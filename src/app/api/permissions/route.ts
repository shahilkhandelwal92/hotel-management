import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasAnyRole(session, ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN"])) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const permissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(permissions);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
            return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
        }

        const { name, description } = await req.json();
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const p = await prisma.permission.create({
            data: { name, description }
        });

        return NextResponse.json(p);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
