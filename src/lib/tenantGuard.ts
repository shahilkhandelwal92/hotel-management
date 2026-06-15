/**
 * tenantGuard.ts
 * ──────────────────────────────────────────────────────────────────────
 * Multi-tenant isolation enforcement.
 *
 * USAGE in every API route:
 *   const session = await getSession();
 *   assertTenant(session, requestedHotelId);
 *
 * Super Admins and Owners bypass tenant isolation checks.
 */

import { NextResponse } from "next/server";

const SUPER_ROLES = ["SUPER_ADMIN", "OWNER"];

export interface Session {
    user: {
        id: string;
        hotelId?: string | null;
        roles?: { role: { name: string } }[];
        permissions?: string[];
    };
}

/**
 * Returns true if the session user is a Super Admin / Owner.
 */
export function isSuperAdmin(session: Session): boolean {
    return (session?.user?.roles ?? []).some((r) =>
        SUPER_ROLES.includes(r.role.name)
    );
}

/**
 * Throws a 403 NextResponse if the session does NOT own the requested hotel.
 * Super Admins bypass the check.
 *
 * @returns void — throws NextResponse on violation
 */
export function assertTenant(
    session: Session | null,
    requestedHotelId: string | null | undefined
): void | NextResponse {
    if (!session?.user) {
        throw new TenantViolation("Unauthenticated");
    }

    // Super Admins can see everything
    if (isSuperAdmin(session)) return;

    // Hotel staff must only access their own hotel
    if (session.user.hotelId && requestedHotelId) {
        if (session.user.hotelId !== requestedHotelId) {
            throw new TenantViolation(
                `Access denied: hotel ${requestedHotelId} is not your tenant.`
            );
        }
    }
}

/**
 * Returns the effective hotelId from session for safe query scoping.
 * Super Admins can pass any hotelId; regular users are locked to their own.
 */
export function resolveHotelId(
    session: Session | null,
    queryHotelId?: string | null
): string | null {
    if (!session?.user) return null;
    if (isSuperAdmin(session)) return queryHotelId ?? null;
    return session.user.hotelId ?? null;
}

/**
 * Custom error class for tenant violations.
 * Caught in API routes to return 403.
 */
export class TenantViolation extends Error {
    status = 403;
    constructor(message = "Forbidden: tenant violation") {
        super(message);
        this.name = "TenantViolation";
    }
}

/**
 * Convenience wrapper: returns a NextResponse 403 if tenant check fails.
 * Returns null if OK (caller can proceed).
 */
export function checkTenant(
    session: Session | null,
    hotelId: string | null | undefined
): NextResponse | null {
    try {
        assertTenant(session, hotelId);
        return null;
    } catch (e) {
        if (e instanceof TenantViolation) {
            return NextResponse.json(
                { error: e.message },
                { status: 403 }
            );
        }
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
}

/**
 * Enforce SaaS plan limits at runtime.
 * @param metric  "rooms" | "users" | "invoices" | "reservations"
 * @param count   Current count in the system
 * @param limit   Maximum allowed by plan
 */
export function assertPlanLimit(
    metric: string,
    count: number,
    limit: number
): void {
    if (count >= limit) {
        throw new TenantViolation(
            `Plan limit reached: your plan allows ${limit} ${metric}. Upgrade your subscription to add more.`
        );
    }
}
