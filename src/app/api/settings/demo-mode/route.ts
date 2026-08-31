import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";

async function ensureSettingsTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SystemSetting" (
            "key" TEXT PRIMARY KEY,
            "value" TEXT NOT NULL,
            "updatedAt" TIMESTAMP DEFAULT NOW()
        )
    `);
}

export async function GET() {
    try {
        await ensureSettingsTable();
        const result = await prisma.$queryRaw<{ value: string }[]>`
            SELECT value FROM "SystemSetting" WHERE key = 'demo_mode'
        `;

        const isProduction = process.env.NODE_ENV === "production";
        const envDemoFlag = process.env.ENABLE_DEMO_MODE === "true";

        let isDemo: boolean;
        if (result.length > 0) {
            isDemo = result[0].value === "true";
        } else {
            // Production default is strictly false; development default is configurable
            isDemo = isProduction ? false : envDemoFlag;
        }

        return NextResponse.json({ demoMode: isDemo });
    } catch {
        return NextResponse.json({ demoMode: false });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
        return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    try {
        await ensureSettingsTable();
        const { demoMode } = await request.json();
        const demoBool = Boolean(demoMode);

        await prisma.$executeRawUnsafe(`
            INSERT INTO "SystemSetting" (key, value, "updatedAt")
            VALUES ('demo_mode', $1, NOW())
            ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()
        `, String(demoBool));

        return NextResponse.json({ success: true, demoMode: demoBool });
    } catch (err) {
        console.error("Failed to save demo mode", err);
        return NextResponse.json({ error: "Failed to save demo mode setting" }, { status: 500 });
    }
}
