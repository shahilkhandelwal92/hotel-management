import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

const secretKey = jwtSecret || 'development-only-hotel-secret-key';
const key = new TextEncoder().encode(secretKey);

// Public routes — no auth required
const publicRoutes = ["/login", "/", "/book-event", "/corporate", "/guest", "/showcase", "/presentation", "/developer"];
const publicRoutePrefixes = ["/guest/", "/showcase/", "/presentation/", "/developer/"];
const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/apnacomplex/auth',
    '/api/apnacomplex/billing',
    '/api/requests',
    '/api/access/staff-qr/verify',
    '/api/locks/webhook',
];
const publicApiRoutePrefixes = [
    '/api/events/verify/',
    '/api/guests/verify/',
    '/api/corporate/events/',
    '/api/guest/',
];

// ── IP Rate Limiter ────────────────────────────────────────────
// Structure: { count, resetAt, blacklistedUntil }
const ipTracker = new Map<string, { count: number; resetAt: number; failures: number; blacklistedUntil: number }>();

function getIpEntry(ip: string) {
    const now = Date.now();
    const existing = ipTracker.get(ip);
    if (!existing || now > existing.resetAt) {
        const entry = { count: 1, resetAt: now + 60_000, failures: existing?.failures ?? 0, blacklistedUntil: existing?.blacklistedUntil ?? 0 };
        ipTracker.set(ip, entry);
        return entry;
    }
    existing.count++;
    return existing;
}

function checkRateLimit(ip: string, limit = 60): boolean {
    const entry = getIpEntry(ip);
    return entry.count <= limit;
}

function checkAuthRateLimit(ip: string): { allowed: boolean; blacklisted: boolean } {
    const now = Date.now();
    const entry = ipTracker.get(ip) ?? { count: 0, resetAt: now + 60_000, failures: 0, blacklistedUntil: 0 };

    // Blacklisted?
    if (entry.blacklistedUntil > now) {
        return { allowed: false, blacklisted: true };
    }

    entry.count++;
    if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + 60_000;
    }
    ipTracker.set(ip, entry);

    // Hotels commonly share one public IP across front desk, kitchen, and
    // back-office devices. Failed credentials are tracked separately below.
    const loginLimit = process.env.NODE_ENV === 'production' ? 20 : 120;
    return { allowed: entry.count <= loginLimit, blacklisted: false };
}

// Called on auth failure — increments failure count, blacklists at 10
export function recordAuthFailure(ip: string): void {
    const now = Date.now();
    const entry = ipTracker.get(ip) ?? { count: 0, resetAt: now + 60_000, failures: 0, blacklistedUntil: 0 };
    entry.failures++;

    // Exponential backoff blacklist: 10 failures → 5min, 15 → 30min, 20+ → 24h
    if (entry.failures >= 20) {
        entry.blacklistedUntil = now + 24 * 60 * 60 * 1000; // 24h
    } else if (entry.failures >= 15) {
        entry.blacklistedUntil = now + 30 * 60 * 1000; // 30 min
    } else if (entry.failures >= 10) {
        entry.blacklistedUntil = now + 5 * 60 * 1000; // 5 min
    }

    ipTracker.set(ip, entry);
}

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        '127.0.0.1'
    );
}

function homeForRoles(roles: string[]): string {
    if (roles.some((role) => role === 'SUPER_ADMIN' || role === 'OWNER')) return '/admin/dashboard';
    if (roles.includes('ACCOUNTING')) return '/admin/reports/analytics';
    if (roles.includes('HOTEL_ADMIN') || roles.includes('ADMIN')) return '/admin/reservations';
    if (roles.some((role) => ['KITCHEN', 'RESTAURANT', 'FNB_MANAGER'].includes(role))) return '/restaurant/orders';
    if (roles.includes('CORPORATE')) return '/corporate/dashboard';
    return '/staff/dashboard';
}

// ── Middleware ─────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Handle both exact matches and trailing slash variations.
    const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    const isPublicRoute = publicRoutes.some(r => r === normalizedPath);
    const isPublicCorporateEventRoute =
        pathname.startsWith('/corporate/') && pathname !== '/corporate/dashboard';
    const isPublicRoutePrefix =
        publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix)) ||
        isPublicCorporateEventRoute;
    const isPublicApiRoute = publicApiRoutes.some((route) => normalizedPath === route);
    const isPublicApiRoutePrefix = publicApiRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
    const isPublicFile =
        !pathname.startsWith('/api/') &&
        /\.(?:svg|png|jpe?g|gif|webp|ico|css|js|map|woff2?|ttf|mp4|webm)$/i.test(pathname);
    const isStaticAsset =
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        isPublicFile ||
        pathname === '/favicon.ico' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml';

    if (isStaticAsset) {
        return NextResponse.next();
    }

    const ip = getClientIp(request);

    // ── Auth endpoint: strict rate limit + IP blacklist ────────
    if (pathname.startsWith('/api/auth/login')) {
        const { allowed, blacklisted } = checkAuthRateLimit(ip);
        if (blacklisted) {
            return NextResponse.json(
                { error: 'Your IP has been temporarily blocked due to repeated login failures.' },
                { status: 403, headers: { 'Retry-After': '300' } }
            );
        }
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please wait 1 minute.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }
    }

    const isPublicApi = isPublicApiRoute || isPublicApiRoutePrefix;
    if (isPublicApi && !pathname.startsWith('/api/auth/login') && !checkRateLimit(ip, 60)) {
        return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Public pages and explicitly public integrations still pass through
    // the login limiter above.
    if (isPublicRoute || isPublicRoutePrefix || isPublicApi) {
        return NextResponse.next();
    }

    // ── General rate limit (300 req/min per instance) ──────────
    if (!checkRateLimit(ip, 300)) {
        return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // ── Session check ──────────────────────────────────────────
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // ── Decode JWT → inject tenant headers ────────────────────
    let hotelId: string | null = null;
    let userId: string | null = null;
    let userRole: string | null = null;
    let userRoles: string[] = [];

    try {
        const { payload } = await jwtVerify(sessionToken, key, { algorithms: ['HS256'] });
        userId = (payload.id as string) ?? null;
        hotelId = (payload.hotelId as string) ?? null;
        const roles = payload.roles as string[] | string | undefined;
        if (Array.isArray(roles)) {
            userRoles = roles;
            userRole = roles.find((role) => role === "SUPER_ADMIN" || role === "OWNER") ?? roles[0] ?? null;
        }
        else if (typeof roles === 'string') {
            userRoles = [roles];
            userRole = roles;
        }
    } catch {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const isGlobalAdmin = userRoles.some((role) => role === 'SUPER_ADMIN' || role === 'OWNER');
    const isAccounting = userRoles.includes('ACCOUNTING');
    const isHotelAdmin = userRoles.some((role) => role === 'HOTEL_ADMIN' || role === 'ADMIN');
    const isRestaurant = userRoles.some((role) => ['KITCHEN', 'RESTAURANT', 'FNB_MANAGER'].includes(role));
    const isStaff = userRoles.some((role) => ['STAFF', 'HOUSEKEEPING', 'FRONT_DESK', 'HR', 'MANAGER'].includes(role));
    const isCorporate = userRoles.includes('CORPORATE');

    let forbiddenPage = false;
    if (
        pathname.startsWith('/admin/reports') ||
        pathname.startsWith('/admin/accounting') ||
        pathname.startsWith('/admin/billing')
    ) {
        forbiddenPage = !isGlobalAdmin && !isAccounting;
    } else if (pathname.startsWith('/admin/payroll')) {
        forbiddenPage = !isGlobalAdmin && !isAccounting && !isHotelAdmin;
    } else if (pathname.startsWith('/admin')) {
        forbiddenPage = !isGlobalAdmin && !isHotelAdmin;
    } else if (pathname.startsWith('/restaurant')) {
        forbiddenPage = !isGlobalAdmin && !isHotelAdmin && !isRestaurant;
    } else if (pathname.startsWith('/staff')) {
        forbiddenPage = !isGlobalAdmin && !isHotelAdmin && !isStaff && !isRestaurant;
    } else if (pathname.startsWith('/corporate/dashboard')) {
        forbiddenPage = !isGlobalAdmin && !isHotelAdmin && !isCorporate;
    }
    if (forbiddenPage && !pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL(homeForRoles(userRoles), request.url));
    }

    // ── Clone request headers, DELETE client-sent forgeries ────
    // CRITICAL: Client cannot forge X-Hotel-Id — we overwrite it
    // from the verified JWT payload, not from the incoming request.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete('x-hotel-id');   // strip ANY client-sent value
    requestHeaders.delete('x-user-id');
    requestHeaders.delete('x-user-role');
    requestHeaders.delete('x-tenant-id'); // alias guard

    // Inject from JWT — these are the ONLY authoritative values
    if (userId) requestHeaders.set('x-user-id', userId);
    if (hotelId) requestHeaders.set('x-hotel-id', hotelId);
    if (userRole) requestHeaders.set('x-user-role', userRole);

    // ── Build response with forwarded request headers ──────────
    // NextResponse.next({ request: { headers } }) forwards the
    // cleaned headers into the API route's req.headers — not just
    // the response. This is how Next.js middleware injects context.
    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // Security response headers
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:;"
    );

    return response;
}

export const config = {
    // Covers ALL routes including /admin/* and /api/*
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
