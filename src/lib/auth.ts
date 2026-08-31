import bcrypt from 'bcryptjs';
import { JWTPayload, SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';

const jwtSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

const secretKey = jwtSecret || 'development-only-hotel-secret-key';
const key = new TextEncoder().encode(secretKey);

export type SessionRole = {
    role: {
        name: string;
    };
};

export type SessionUser = {
    id: string;
    email?: string;
    name?: string;
    hotelId: string | null;
    roles: SessionRole[];
    permissions: string[];
};

export type Session = {
    id: string;
    email?: string;
    name?: string;
    hotelId: string | null;
    roles: string[];
    permissions: string[];
    user: SessionUser;
    issuedAt?: number;
    expiresAt?: number;
};

type SessionTokenInput = {
    id: string;
    email?: string;
    name?: string;
    hotelId?: string | null;
    roles?: string[] | string;
    permissions?: string[];
};

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
}

function normalizeSession(payload: JWTPayload): Session | null {
    if (typeof payload.id !== 'string' || !payload.id) return null;

    const roles = normalizeStringArray(payload.roles);
    const permissions = normalizeStringArray(payload.permissions);
    const hotelId = typeof payload.hotelId === 'string' ? payload.hotelId : null;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const name = typeof payload.name === 'string' ? payload.name : undefined;

    return {
        id: payload.id,
        email,
        name,
        hotelId,
        roles,
        permissions,
        user: {
            id: payload.id,
            email,
            name,
            hotelId,
            roles: roles.map((roleName) => ({ role: { name: roleName } })),
            permissions,
        },
        issuedAt: payload.iat,
        expiresAt: payload.exp,
    };
}

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function encrypt(payload: SessionTokenInput) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function decrypt(input: string): Promise<Session | null> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return normalizeSession(payload);
    } catch {
        return null;
    }
}

export async function getSession(): Promise<Session | null> {
    // 1. Check HTTP-only session cookie (Web flow)
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session')?.value;
        if (sessionCookie) {
            const session = await decrypt(sessionCookie);
            if (session) return session;
        }
    } catch {
        // cookies() unavailable outside request context
    }

    // 2. Check Authorization: Bearer <token> header (Mobile/API flow)
    try {
        const headerStore = await headers();
        const authHeader = headerStore.get('authorization') || headerStore.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token) {
                return await decrypt(token);
            }
        }
    } catch {
        // headers() unavailable outside request context
    }

    return null;
}

export function hasAnyRole(session: Session | null, allowedRoles: string[]): boolean {
    return !!session && session.roles.some((role) => allowedRoles.includes(role));
}
