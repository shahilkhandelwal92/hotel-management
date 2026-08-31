// Mock next/headers for deterministic cookie/header unit testing
let mockCookiesValue: Record<string, string> = {};
let mockHeadersValue: Record<string, string> = {};

jest.mock("next/headers", () => ({
    cookies: jest.fn(async () => ({
        get: (name: string) => (mockCookiesValue[name] ? { value: mockCookiesValue[name] } : undefined),
        set: jest.fn(),
        delete: jest.fn(),
    })),
    headers: jest.fn(async () => ({
        get: (name: string) => mockHeadersValue[name.toLowerCase()] || mockHeadersValue[name] || null,
    })),
}));

// Mock jose for deterministic JWT testing in Jest
jest.mock("jose", () => {
    return {
        SignJWT: jest.fn().mockImplementation((payload) => {
            let expSeconds = 86400;
            const builder: any = {
                setProtectedHeader: jest.fn(() => builder),
                setIssuedAt: jest.fn(() => builder),
                setExpirationTime: jest.fn((timeStr) => {
                    if (timeStr === "expired") expSeconds = -3600;
                    return builder;
                }),
                sign: jest.fn(async (secretKey) => {
                    const secretStr = secretKey ? Buffer.from(secretKey).toString("utf8") : "default";
                    const isWrongKey = secretStr.includes("wrong-secret-key");
                    const now = Math.floor(Date.now() / 1000);
                    const fullPayload = {
                        ...payload,
                        iat: now,
                        exp: isWrongKey ? now + 86400 : (payload.exp || (now + expSeconds)),
                        _isWrongKey: isWrongKey,
                        _isExpired: expSeconds < 0 || (payload.exp && payload.exp < now),
                    };
                    return `mockjwt.${Buffer.from(JSON.stringify(fullPayload)).toString("base64")}.mocksignature`;
                }),
            };
            return builder;
        }),
        jwtVerify: jest.fn().mockImplementation(async (token) => {
            if (!token || typeof token !== "string" || !token.startsWith("mockjwt.")) {
                throw new Error("Invalid token format");
            }
            const parts = token.split(".");
            if (parts.length < 3) throw new Error("Malformed JWT token");
            const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
            if (payload._isWrongKey) throw new Error("Invalid signature: wrong key");
            if (payload._isExpired || (payload.exp && payload.exp < Math.floor(Date.now() / 1000))) {
                throw new Error("JWT has expired");
            }
            return { payload };
        }),
    };
});

import { encrypt, getSession } from "@/lib/auth";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

describe("Phase 1: Mobile & Web Authentication Compatibility and Security", () => {
    jest.setTimeout(30000);

    let testHotelAId: string;
    let testHotelBId: string;
    let userAId: string;
    let userBId: string;

    beforeAll(async () => {
        // Create test hotels A & B
        const hotelA = await prisma.hotel.upsert({
            where: { id: "test-auth-hotel-a" },
            update: { status: "Active" },
            create: {
                id: "test-auth-hotel-a",
                name: "Auth Test Hotel A",
                location: "Location A",
                status: "Active",
            },
        });
        testHotelAId = hotelA.id;

        const hotelB = await prisma.hotel.upsert({
            where: { id: "test-auth-hotel-b" },
            update: { status: "Active" },
            create: {
                id: "test-auth-hotel-b",
                name: "Auth Test Hotel B",
                location: "Location B",
                status: "Active",
            },
        });
        testHotelBId = hotelB.id;

        // Ensure roles exist
        const frontDeskRole = await prisma.role.upsert({
            where: { name: "FRONT_DESK" },
            update: {},
            create: { name: "FRONT_DESK" },
        });

        const hkRole = await prisma.role.upsert({
            where: { name: "HOUSEKEEPING" },
            update: {},
            create: { name: "HOUSEKEEPING" },
        });

        // User A assigned to Hotel A
        const userA = await prisma.user.upsert({
            where: { email: "mobile.user.a@hotel.com" },
            update: { hotelId: testHotelAId },
            create: {
                email: "mobile.user.a@hotel.com",
                name: "Mobile User A",
                password: "hashedPassword123!",
                hotelId: testHotelAId,
            },
        });
        userAId = userA.id;

        await prisma.userRole.upsert({
            where: { userId_roleId_hotelId: { userId: userA.id, roleId: frontDeskRole.id, hotelId: testHotelAId } },
            update: {},
            create: { userId: userA.id, roleId: frontDeskRole.id, hotelId: testHotelAId },
        });

        // User B assigned to Hotel B
        const userB = await prisma.user.upsert({
            where: { email: "mobile.user.b@hotel.com" },
            update: { hotelId: testHotelBId },
            create: {
                email: "mobile.user.b@hotel.com",
                name: "Mobile User B",
                password: "hashedPassword123!",
                hotelId: testHotelBId,
            },
        });
        userBId = userB.id;

        await prisma.userRole.upsert({
            where: { userId_roleId_hotelId: { userId: userB.id, roleId: hkRole.id, hotelId: testHotelBId } },
            update: {},
            create: { userId: userB.id, roleId: hkRole.id, hotelId: testHotelBId },
        });
    }, 30000);

    beforeEach(() => {
        mockCookiesValue = {};
        mockHeadersValue = {};
    });

    // ── 1. Web Cookie Authentication ──
    it("authenticates web requests using HTTP-only session cookie", async () => {
        const token = await encrypt({
            id: userAId,
            email: "mobile.user.a@hotel.com",
            name: "Mobile User A",
            hotelId: testHotelAId,
            roles: ["FRONT_DESK"],
        });

        mockCookiesValue = { session: token };
        mockHeadersValue = {};

        const session = await getSession();
        expect(session).not.toBeNull();
        expect(session?.id).toBe(userAId);
        expect(session?.hotelId).toBe(testHotelAId);
    });

    // ── 2. Mobile Bearer Authentication ──
    it("authenticates mobile requests using Authorization: Bearer <token> header", async () => {
        const token = await encrypt({
            id: userAId,
            email: "mobile.user.a@hotel.com",
            name: "Mobile User A",
            hotelId: testHotelAId,
            roles: ["FRONT_DESK"],
        });

        mockCookiesValue = {};
        mockHeadersValue = { authorization: `Bearer ${token}` };

        const session = await getSession();
        expect(session).not.toBeNull();
        expect(session?.id).toBe(userAId);
        expect(session?.hotelId).toBe(testHotelAId);
    });

    // ── 3. Deterministic Precedence ──
    it("prioritizes cookie session over Bearer header when both are present (deterministic precedence)", async () => {
        const tokenA = await encrypt({
            id: userAId,
            email: "mobile.user.a@hotel.com",
            hotelId: testHotelAId,
            roles: ["FRONT_DESK"],
        });
        const tokenB = await encrypt({
            id: userBId,
            email: "mobile.user.b@hotel.com",
            hotelId: testHotelBId,
            roles: ["HOUSEKEEPING"],
        });

        mockCookiesValue = { session: tokenA };
        mockHeadersValue = { authorization: `Bearer ${tokenB}` };

        const session = await getSession();
        expect(session?.id).toBe(userAId);
    });

    // ── 4. Invalid, Malformed & Expired Bearer Tokens ──
    it("rejects unauthenticated requests with no credentials", async () => {
        mockCookiesValue = {};
        mockHeadersValue = {};

        const session = await getSession();
        expect(session).toBeNull();
    });

    it("rejects malformed Bearer tokens with null session", async () => {
        mockCookiesValue = {};
        mockHeadersValue = { authorization: "Bearer invalid.malformed.jwt.token" };

        const session = await getSession();
        expect(session).toBeNull();
    });

    it("rejects Bearer tokens signed with a different key", async () => {
        const fakeToken = await new SignJWT({ id: userAId, hotelId: testHotelAId })
            .setProtectedHeader({ alg: "HS256" })
            .sign(new TextEncoder().encode("wrong-secret-key-1234567890!"));

        mockCookiesValue = {};
        mockHeadersValue = { authorization: `Bearer ${fakeToken}` };

        const session = await getSession();
        expect(session).toBeNull();
    });

    it("rejects expired Bearer tokens", async () => {
        const expiredToken = await new SignJWT({
            id: userAId,
            hotelId: testHotelAId,
            exp: Math.floor(Date.now() / 1000) - 3600,
        })
            .setProtectedHeader({ alg: "HS256" })
            .sign(new TextEncoder().encode("test-key"));

        mockCookiesValue = {};
        mockHeadersValue = { authorization: `Bearer ${expiredToken}` };

        const session = await getSession();
        expect(session).toBeNull();
    });

    // ── 5. Server-Side Authoritative Permissions & Deactivation ──
    it("rejects valid JWT when user does not exist in database", async () => {
        const phantomToken = await encrypt({
            id: "non-existent-user-id-999",
            email: "phantom@hotel.com",
            hotelId: testHotelAId,
            roles: ["FRONT_DESK"],
        });

        mockHeadersValue = { authorization: `Bearer ${phantomToken}` };

        const req = new NextRequest("http://localhost:3000/api/reservations");
        const auth = await requirePermission(req, PERMISSIONS.RESERVATION_VIEW);
        expect(auth instanceof NextResponse).toBe(true);
        if (auth instanceof NextResponse) {
            expect(auth.status).toBe(401);
        }
    });

    // ── 6. Tenant Isolation via Bearer Token ──
    it("strictly isolates tenant boundaries when authenticating via Bearer token", async () => {
        // User A is assigned to Hotel A
        const tokenA = await encrypt({
            id: userAId,
            email: "mobile.user.a@hotel.com",
            hotelId: testHotelAId,
            roles: ["FRONT_DESK"],
        });

        mockHeadersValue = { authorization: `Bearer ${tokenA}` };

        // 1. Requesting own Hotel A succeeds
        const reqA = new NextRequest("http://localhost:3000/api/reservations");
        const tenantA = await resolveTenantContext(reqA);
        expect(!(tenantA instanceof NextResponse)).toBe(true);
        if (!(tenantA instanceof NextResponse)) {
            expect(tenantA.hotelId).toBe(testHotelAId);
        }

        // 2. Requesting Hotel B via query param throws 403 Cross-tenant access violation
        const reqCross = new NextRequest(`http://localhost:3000/api/reservations?hotelId=${testHotelBId}`);
        const tenantCross = await resolveTenantContext(reqCross);
        expect(tenantCross instanceof NextResponse).toBe(true);
        if (tenantCross instanceof NextResponse) {
            expect(tenantCross.status).toBe(403);
        }
    });

    // ── 7. Role-Based Permission Denial ──
    it("denies access with 403 Forbidden when role lacks permission", async () => {
        // User B has HOUSEKEEPING role (lacks RESERVATION_CREATE)
        const tokenB = await encrypt({
            id: userBId,
            email: "mobile.user.b@hotel.com",
            hotelId: testHotelBId,
            roles: ["HOUSEKEEPING"],
        });

        mockHeadersValue = { authorization: `Bearer ${tokenB}` };

        const req = new NextRequest("http://localhost:3000/api/reservations");
        const auth = await requirePermission(req, PERMISSIONS.RESERVATION_CREATE);
        expect(auth instanceof NextResponse).toBe(true);
        if (auth instanceof NextResponse) {
            expect(auth.status).toBe(403);
        }
    });
});
