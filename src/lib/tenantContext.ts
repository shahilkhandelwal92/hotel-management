/**
 * Authoritative Server-Side Tenant Context
 * ──────────────────────────────────────────────────────────────────────
 * Eliminates security dependence on client-sent headers.
 * Resolves tenant boundaries authoritatively from the verified session and database.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAuthoritativeUserContext, AuthContext } from "./permissions";

export interface ResolvedTenantContext {
    auth: AuthContext;
    hotelId: string;
    isSuperAdmin: boolean;
}

export type TenantResolutionResult =
    | { success: true; context: ResolvedTenantContext }
    | { success: false; response: NextResponse };

/**
 * Resolve authoritative tenant context for an incoming API request.
 * - Standard Staff: Strictly locked to user's authorized hotel from database.
 * - Super Admins / Owners: Can specify hotelId via query param / body after explicit DB access check.
 */
export async function resolveTenantContext(
    req: NextRequest,
    targetHotelId?: string | null
): Promise<TenantResolutionResult> {
    const session = await getSession();
    if (!session?.id) {
        return {
            success: false,
            response: NextResponse.json(
                { error: "Authentication required", code: "UNAUTHENTICATED" },
                { status: 401 }
            ),
        };
    }

    const auth = await getAuthoritativeUserContext(session.id, targetHotelId);
    if (!auth) {
        return {
            success: false,
            response: NextResponse.json(
                { error: "Active user session not found or account disabled", code: "USER_INVALID" },
                { status: 401 }
            ),
        };
    }

    // 1. Super Admin / Owner Branch
    if (auth.isSuperAdmin) {
        // Query param or explicit target
        const requestedId =
            targetHotelId ||
            new URL(req.url).searchParams.get("hotelId") ||
            auth.hotelId;

        if (!requestedId) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: "Hotel property must be specified for administrative action", code: "PROPERTY_REQUIRED" },
                    { status: 400 }
                ),
            };
        }

        // Verify hotel exists and is active in DB
        const hotel = await prisma.hotel.findUnique({
            where: { id: requestedId },
            select: { id: true, status: true },
        });

        if (!hotel) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: `Property with ID [${requestedId}] not found`, code: "HOTEL_NOT_FOUND" },
                    { status: 404 }
                ),
            };
        }

        return {
            success: true,
            context: {
                auth,
                hotelId: hotel.id,
                isSuperAdmin: true,
            },
        };
    }

    // 2. Standard Staff / Hotel Admin Branch (Authoritative Tenant from DB)
    const staffHotelId = auth.hotelId;
    if (!staffHotelId) {
        return {
            success: false,
            response: NextResponse.json(
                { error: "User is not assigned to an active hotel property", code: "TENANT_UNASSIGNED" },
                { status: 403 }
            ),
        };
    }

    // Check if user is attempting to access a different hotel than assigned
    const queryHotelId = new URL(req.url).searchParams.get("hotelId");
    if (queryHotelId && queryHotelId !== staffHotelId) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    error: "Cross-tenant access violation: You are not authorized for the requested property",
                    code: "CROSS_TENANT_FORBIDDEN",
                },
                { status: 403 }
            ),
        };
    }

    return {
        success: true,
        context: {
            auth,
            hotelId: staffHotelId,
            isSuperAdmin: false,
        },
    };
}
