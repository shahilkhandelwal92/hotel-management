import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Server-side theme storage using a raw settings JSON approach
// We'll use our database to store theme per hotel via a "global" settings key

async function ensureSettingsTable() {
    // Create a system_settings table if it doesn't exist via raw SQL
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
            SELECT value FROM "SystemSetting" WHERE key = 'theme'
        `;
        if (result.length === 0) {
            return NextResponse.json({ accentColor: '#c9a96e', sidebarBg: '#1a1612', backgroundImage: '', customBg: '' });
        }
        return NextResponse.json(JSON.parse(result[0].value));
    } catch {
        return NextResponse.json({ accentColor: '#c9a96e', sidebarBg: '#1a1612', backgroundImage: '', customBg: '' });
    }
}

export async function POST(request: Request) {
    try {
        await ensureSettingsTable();
        const theme = await request.json();
        await prisma.$executeRawUnsafe(`
            INSERT INTO "SystemSetting" (key, value, "updatedAt")
            VALUES ('theme', $1, NOW())
            ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()
        `, JSON.stringify(theme));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to save theme', err);
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
