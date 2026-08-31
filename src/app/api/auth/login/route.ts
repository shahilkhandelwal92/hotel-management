import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

function getClientIp(request: Request): string {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? '127.0.0.1';
    return ip;
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // ── Check DB-persisted IP blacklist FIRST ─────────────────
        const blacklistEntry = await prisma.ipBlacklist.findFirst({
            where: {
                ipAddress: ip,
                expiresAt: { gt: new Date() }, // still active
            },
        });
        if (blacklistEntry) {
            // Log repeated attack attempt
            await prisma.auditLog.create({
                data: {
                    module: 'Security',
                    action: 'LOGIN',
                    ipAddress: ip,
                    details: `Blocked login attempt from blacklisted IP: ${ip} (reason: ${blacklistEntry.reason})`,
                    userAgent: request.headers.get('user-agent') ?? null,
                },
            }).catch(() => { }); // never crash login on log failure

            return NextResponse.json(
                { error: 'Your IP has been temporarily blocked due to repeated login failures. Try again later.' },
                { status: 403, headers: { 'Retry-After': '300' } }
            );
        }

        // ── Validate credentials ───────────────────────────────────
        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        });

        if (!user || !(await comparePassword(password, user.password))) {
            // Track failure and potentially blacklist
            await recordAuthFailureDB(ip, request);
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // ── Successful login — reset failure counter ───────────────
        await prisma.loginAttempt.upsert({
            where: { ipAddress: ip },
            update: { failureCount: 0, lastAttemptAt: new Date() },
            create: { ipAddress: ip, failureCount: 0, lastAttemptAt: new Date() },
        }).catch(() => { }); // non-critical

        const userRoles = user.roles
            .filter((assignment) => assignment.hotelId === user.hotelId || assignment.hotelId === null)
            .map((assignment) => assignment.role.name);
        if (userRoles.length === 0) {
            return NextResponse.json({ error: 'No active role is assigned for this hotel' }, { status: 403 });
        }
        const sessionData = {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: userRoles,
            hotelId: user.hotelId,
        };

        const sessionToken = await encrypt(sessionData);
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, user: sessionData, token: sessionToken });
    } catch (error) {
        logger.error('Login error', { error: (error as Error).message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Record an auth failure. Blacklists IP if threshold exceeded.
 * Exponential escalation: 10→5min, 15→30min, 20→24h
 * Logged to AuditLog for historical attack pattern analysis.
 */
async function recordAuthFailureDB(ip: string, request: NextRequest): Promise<void> {
    try {
        // Upsert failure count
        const attempt = await prisma.loginAttempt.upsert({
            where: { ipAddress: ip },
            update: { failureCount: { increment: 1 }, lastAttemptAt: new Date() },
            create: { ipAddress: ip, failureCount: 1, lastAttemptAt: new Date() },
        });

        const failures = attempt.failureCount;

        // Determine blacklist duration
        let blacklistMinutes = 0;
        if (failures >= 20) blacklistMinutes = 24 * 60;     // 24h
        else if (failures >= 15) blacklistMinutes = 30;      // 30min
        else if (failures >= 10) blacklistMinutes = 5;       // 5min

        if (blacklistMinutes > 0) {
            const expiresAt = new Date(Date.now() + blacklistMinutes * 60_000);

            await prisma.ipBlacklist.upsert({
                where: { ipAddress: ip },
                update: { expiresAt, reason: `${failures} failed login attempts`, updatedAt: new Date() },
                create: {
                    ipAddress: ip,
                    reason: `${failures} failed login attempts`,
                    expiresAt,
                },
            });

            // ── Log to AuditLog for historical attack pattern analysis ──
            await prisma.auditLog.create({
                data: {
                    module: 'Security',
                    action: 'LOGIN',
                    ipAddress: ip,
                    details: `IP blacklisted for ${blacklistMinutes}min after ${failures} failed login attempts`,
                    userAgent: request.headers.get('user-agent') ?? null,
                },
            });
        }
    } catch (err) {
        logger.error('Failed to record auth failure', { err, ip });
    }
}
