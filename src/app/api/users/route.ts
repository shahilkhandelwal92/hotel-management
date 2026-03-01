import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession, hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            include: { roles: { include: { role: true } } },
            orderBy: { createdAt: "desc" }
        });

        // Format to flatten roles
        const formatted = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roles: u.roles.map((r: any) => r.role.name)
        }));

        return NextResponse.json(formatted);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, password, roles } = body; // roles is an array of strings like ["HOTEL_ADMIN", "KITCHEN"]

        const passwordHash = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: passwordHash
            }
        });

        // Assign multiple roles
        if (roles && roles.length > 0) {
            for (const roleName of roles) {
                const dbRole = await prisma.role.findUnique({ where: { name: roleName } });
                if (dbRole) {
                    await prisma.userRole.create({
                        data: { userId: newUser.id, roleId: dbRole.id }
                    });
                }
            }
        }

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: session.id,
                action: "USER_CREATED",
                entityType: "User",
                entityId: newUser.id,
                details: JSON.stringify({ email, rolesAssigned: roles }),
                ipAddress: request.headers.get("x-forwarded-for") || "unknown"
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
