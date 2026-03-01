import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth'; // Ensure this can run in Edge if needed, or use a simplified edge-compatible verify

// A list of public routes that do not require authentication
const publicRoutes = ['/login', '/book-event', '/corporate'];
// API routes that handle their own auth or do not require it
const publicApiRoutes = ['/api/auth/login', '/api/apnacomplex/auth', '/api/apnacomplex/billing'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow Next.js assets, public images, Next-intl middleware
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') ||
        pathname === '/' // Root redirects or handles its own logic
    ) {
        return NextResponse.next();
    }

    // Check if route is explicitly public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute || isPublicApiRoute) {
        return NextResponse.next();
    }

    // Attempt to parse the secure HttpOnly cookie
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
        // If it's an API route without a token, throw a 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }
        // Redirect unauthorized web traffic to login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // In a real Edge Middleware, you would decrypt the JWT here.
    // For this prototype, if the HttpOnly secure cookie exists, we allow it to pass to the API/Page
    // The individual APIs (like /api/users, /api/leads) do a secondary hard-check using the `getSession` function from /lib/auth.ts

    // Add Security Headers to responses to prevent XSS, Clickjacking, and MIME sniffing
    const response = NextResponse.next();
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'], // Match all paths
};
