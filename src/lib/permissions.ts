/**
 * Authoritative Server-Side Permission & RBAC Engine
 * ──────────────────────────────────────────────────────────────────────
 * Real permission-based authorization at the API / Server layer.
 * Resolves permissions dynamically from the database (UserRole -> Role -> RolePermission).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const PERMISSIONS = {
    // Reservations
    RESERVATION_VIEW: "RESERVATION_VIEW",
    RESERVATION_CREATE: "RESERVATION_CREATE",
    RESERVATION_UPDATE: "RESERVATION_UPDATE",
    RESERVATION_CANCEL: "RESERVATION_CANCEL",
    RESERVATION_CHECKIN: "RESERVATION_CHECKIN",
    RESERVATION_CHECKOUT: "RESERVATION_CHECKOUT",

    // Rooms
    ROOM_VIEW: "ROOM_VIEW",
    ROOM_CREATE: "ROOM_CREATE",
    ROOM_UPDATE: "ROOM_UPDATE",
    ROOM_DELETE: "ROOM_DELETE",

    // Guests
    GUEST_VIEW: "GUEST_VIEW",
    GUEST_CREATE: "GUEST_CREATE",
    GUEST_UPDATE: "GUEST_UPDATE",

    // Invoices & Billing
    INVOICE_VIEW: "INVOICE_VIEW",
    INVOICE_CREATE: "INVOICE_CREATE",
    INVOICE_UPDATE: "INVOICE_UPDATE",
    INVOICE_CANCEL: "INVOICE_CANCEL",
    INVOICE_DELETE: "INVOICE_DELETE",

    // Payments
    PAYMENT_VIEW: "PAYMENT_VIEW",
    PAYMENT_CREATE: "PAYMENT_CREATE",
    PAYMENT_REFUND: "PAYMENT_REFUND",

    // Folios
    FOLIO_VIEW: "FOLIO_VIEW",
    FOLIO_ADJUST: "FOLIO_ADJUST",

    // Reports
    REPORT_FINANCIAL: "REPORT_FINANCIAL",
    REPORT_GST: "REPORT_GST",
    REPORT_PAYROLL: "REPORT_PAYROLL",

    // Exports
    EXPORT_GUEST_DATA: "EXPORT_GUEST_DATA",
    EXPORT_FINANCIAL_DATA: "EXPORT_FINANCIAL_DATA",
    EXPORT_PAYROLL_DATA: "EXPORT_PAYROLL_DATA",

    // Payroll & HR
    PAYROLL_VIEW: "PAYROLL_VIEW",
    PAYROLL_APPROVE: "PAYROLL_APPROVE",
    HR_VIEW: "HR_VIEW",
    HR_CREATE: "HR_CREATE",
    HR_UPDATE: "HR_UPDATE",
    HR_DELETE: "HR_DELETE",

    // Housekeeping & Maintenance
    HOUSEKEEPING_VIEW: "HOUSEKEEPING_VIEW",
    HOUSEKEEPING_MANAGE: "HOUSEKEEPING_MANAGE",
    LOST_FOUND_VIEW: "LOST_FOUND_VIEW",
    LOST_FOUND_MANAGE: "LOST_FOUND_MANAGE",

    // Venues & Events
    VENUE_VIEW: "VENUE_VIEW",
    VENUE_MANAGE: "VENUE_MANAGE",

    // Users & Roles
    USER_MANAGE: "USER_MANAGE",
    ROLE_MANAGE: "ROLE_MANAGE",

    // HR Settings
    HR_SETTINGS_MANAGE: "HR_SETTINGS_MANAGE",

    // Tax Configuration & Accounting
    TAX_CONFIG_MANAGE: "TAX_CONFIG_MANAGE",
    TAX_CONFIG_VIEW: "TAX_CONFIG_VIEW",

    // Night Audit
    NIGHT_AUDIT_RUN: "NIGHT_AUDIT_RUN",
    NIGHT_AUDIT_CLOSE: "NIGHT_AUDIT_CLOSE",
    NIGHT_AUDIT_REOPEN: "NIGHT_AUDIT_REOPEN",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

export interface AuthContext {
    userId: string;
    email: string;
    hotelId: string | null;
    roles: string[];
    permissions: Set<string>;
    isSuperAdmin: boolean;
}

// Global role permission map fallback for standard roles
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    SUPER_ADMIN: Object.values(PERMISSIONS),
    OWNER: Object.values(PERMISSIONS),
    HOTEL_ADMIN: [
        PERMISSIONS.RESERVATION_VIEW,
        PERMISSIONS.RESERVATION_CREATE,
        PERMISSIONS.RESERVATION_UPDATE,
        PERMISSIONS.RESERVATION_CANCEL,
        PERMISSIONS.RESERVATION_CHECKIN,
        PERMISSIONS.RESERVATION_CHECKOUT,
        PERMISSIONS.ROOM_VIEW,
        PERMISSIONS.ROOM_CREATE,
        PERMISSIONS.ROOM_UPDATE,
        PERMISSIONS.ROOM_DELETE,
        PERMISSIONS.GUEST_VIEW,
        PERMISSIONS.GUEST_CREATE,
        PERMISSIONS.GUEST_UPDATE,
        PERMISSIONS.INVOICE_VIEW,
        PERMISSIONS.INVOICE_CREATE,
        PERMISSIONS.INVOICE_UPDATE,
        PERMISSIONS.INVOICE_CANCEL,
        PERMISSIONS.PAYMENT_VIEW,
        PERMISSIONS.PAYMENT_CREATE,
        PERMISSIONS.PAYMENT_REFUND,
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.FOLIO_ADJUST,
        PERMISSIONS.REPORT_FINANCIAL,
        PERMISSIONS.REPORT_GST,
        PERMISSIONS.REPORT_PAYROLL,
        PERMISSIONS.EXPORT_GUEST_DATA,
        PERMISSIONS.EXPORT_FINANCIAL_DATA,
        PERMISSIONS.EXPORT_PAYROLL_DATA,
        PERMISSIONS.PAYROLL_VIEW,
        PERMISSIONS.PAYROLL_APPROVE,
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.HR_CREATE,
        PERMISSIONS.HR_UPDATE,
        PERMISSIONS.HR_DELETE,
        PERMISSIONS.HOUSEKEEPING_VIEW,
        PERMISSIONS.HOUSEKEEPING_MANAGE,
        PERMISSIONS.LOST_FOUND_VIEW,
        PERMISSIONS.LOST_FOUND_MANAGE,
        PERMISSIONS.VENUE_VIEW,
        PERMISSIONS.VENUE_MANAGE,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.NIGHT_AUDIT_RUN,
        PERMISSIONS.NIGHT_AUDIT_CLOSE,
        PERMISSIONS.NIGHT_AUDIT_REOPEN,
    ],
    HR: [
        PERMISSIONS.PAYROLL_VIEW,
        PERMISSIONS.PAYROLL_APPROVE,
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.HR_CREATE,
        PERMISSIONS.HR_UPDATE,
        PERMISSIONS.HR_DELETE,
        PERMISSIONS.REPORT_PAYROLL,
        PERMISSIONS.EXPORT_PAYROLL_DATA,
        PERMISSIONS.USER_MANAGE,
    ],
    FRONT_DESK: [
        PERMISSIONS.RESERVATION_VIEW,
        PERMISSIONS.RESERVATION_CREATE,
        PERMISSIONS.RESERVATION_UPDATE,
        PERMISSIONS.RESERVATION_CANCEL,
        PERMISSIONS.RESERVATION_CHECKIN,
        PERMISSIONS.RESERVATION_CHECKOUT,
        PERMISSIONS.ROOM_VIEW,
        PERMISSIONS.GUEST_VIEW,
        PERMISSIONS.GUEST_CREATE,
        PERMISSIONS.GUEST_UPDATE,
        PERMISSIONS.INVOICE_VIEW,
        PERMISSIONS.INVOICE_CREATE,
        PERMISSIONS.PAYMENT_VIEW,
        PERMISSIONS.PAYMENT_CREATE,
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.HOUSEKEEPING_VIEW,
        PERMISSIONS.LOST_FOUND_VIEW,
        PERMISSIONS.LOST_FOUND_MANAGE,
        PERMISSIONS.VENUE_VIEW,
    ],
    ACCOUNTING: [
        PERMISSIONS.INVOICE_VIEW,
        PERMISSIONS.INVOICE_CREATE,
        PERMISSIONS.INVOICE_UPDATE,
        PERMISSIONS.INVOICE_CANCEL,
        PERMISSIONS.PAYMENT_VIEW,
        PERMISSIONS.PAYMENT_CREATE,
        PERMISSIONS.PAYMENT_REFUND,
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.FOLIO_ADJUST,
        PERMISSIONS.REPORT_FINANCIAL,
        PERMISSIONS.REPORT_GST,
        PERMISSIONS.REPORT_PAYROLL,
        PERMISSIONS.EXPORT_FINANCIAL_DATA,
        PERMISSIONS.EXPORT_PAYROLL_DATA,
        PERMISSIONS.PAYROLL_VIEW,
        PERMISSIONS.NIGHT_AUDIT_RUN,
        PERMISSIONS.NIGHT_AUDIT_CLOSE,
    ],
    HOUSEKEEPING: [
        PERMISSIONS.ROOM_VIEW,
        PERMISSIONS.ROOM_UPDATE,
        PERMISSIONS.HOUSEKEEPING_VIEW,
        PERMISSIONS.HOUSEKEEPING_MANAGE,
        PERMISSIONS.LOST_FOUND_VIEW,
        PERMISSIONS.LOST_FOUND_MANAGE,
    ],
};

/**
 * Fetch and resolve active user permissions authoritatively from DB.
 */
export async function getAuthoritativeUserContext(userId: string, targetHotelId?: string | null): Promise<AuthContext | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: { permission: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!user) return null;

    const userRoles = user.roles.map((ur) => ur.role.name);
    const isSuperAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("OWNER");

    const effectiveHotelId = isSuperAdmin && targetHotelId ? targetHotelId : (user.hotelId ?? null);

    const permissionSet = new Set<string>();

    // Super Admin gets all permissions
    if (isSuperAdmin) {
        Object.values(PERMISSIONS).forEach((p) => permissionSet.add(p));
    } else {
        // Collect DB assigned permissions
        user.roles.forEach((ur) => {
            // Check if role is scoped to hotel or global
            if (!ur.hotelId || ur.hotelId === effectiveHotelId) {
                // Role permissions from DB relation
                ur.role.permissions?.forEach((rp) => {
                    if (rp.permission?.name) {
                        permissionSet.add(rp.permission.name);
                    }
                });

                // Add default mapped permissions for standard role name
                const defaultPerms = DEFAULT_ROLE_PERMISSIONS[ur.role.name] ?? [];
                defaultPerms.forEach((p) => permissionSet.add(p));
            }
        });
    }

    return {
        userId: user.id,
        email: user.email,
        hotelId: effectiveHotelId,
        roles: userRoles,
        permissions: permissionSet,
        isSuperAdmin,
    };
}

/**
 * Require a specific permission for an incoming request.
 * Returns either the AuthContext on success or a 401/403 NextResponse on failure.
 */
export async function requirePermission(
    req: NextRequest,
    permission: AppPermission,
    targetHotelId?: string | null
): Promise<AuthContext | NextResponse> {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json(
            { error: "Authentication required", code: "UNAUTHENTICATED" },
            { status: 401 }
        );
    }

    const auth = await getAuthoritativeUserContext(session.id, targetHotelId);
    if (!auth) {
        return NextResponse.json(
            { error: "User session invalid or user disabled", code: "USER_INVALID" },
            { status: 401 }
        );
    }

    if (auth.isSuperAdmin || auth.permissions.has(permission)) {
        return auth;
    }

    return NextResponse.json(
        {
            error: `Access Denied: Missing required permission [${permission}]`,
            code: "FORBIDDEN",
            requiredPermission: permission,
        },
        { status: 403 }
    );
}

/**
 * Require any one of the specified permissions.
 */
export async function requireAnyPermission(
    req: NextRequest,
    permissions: AppPermission[],
    targetHotelId?: string | null
): Promise<AuthContext | NextResponse> {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json(
            { error: "Authentication required", code: "UNAUTHENTICATED" },
            { status: 401 }
        );
    }

    const auth = await getAuthoritativeUserContext(session.id, targetHotelId);
    if (!auth) {
        return NextResponse.json(
            { error: "User session invalid", code: "USER_INVALID" },
            { status: 401 }
        );
    }

    if (auth.isSuperAdmin || permissions.some((p) => auth.permissions.has(p))) {
        return auth;
    }

    return NextResponse.json(
        {
            error: `Access Denied: Requires one of [${permissions.join(", ")}]`,
            code: "FORBIDDEN",
            requiredPermissions: permissions,
        },
        { status: 403 }
    );
}

/**
 * Require all specified permissions.
 */
export async function requireAllPermissions(
    req: NextRequest,
    permissions: AppPermission[],
    targetHotelId?: string | null
): Promise<AuthContext | NextResponse> {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json(
            { error: "Authentication required", code: "UNAUTHENTICATED" },
            { status: 401 }
        );
    }

    const auth = await getAuthoritativeUserContext(session.id, targetHotelId);
    if (!auth) {
        return NextResponse.json(
            { error: "User session invalid", code: "USER_INVALID" },
            { status: 401 }
        );
    }

    const missing = permissions.filter((p) => !auth.permissions.has(p));
    if (auth.isSuperAdmin || missing.length === 0) {
        return auth;
    }

    return NextResponse.json(
        {
            error: `Access Denied: Missing permissions [${missing.join(", ")}]`,
            code: "FORBIDDEN",
            missingPermissions: missing,
        },
        { status: 403 }
    );
}
