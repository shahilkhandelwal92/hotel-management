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

    // Enterprise Approvals & Tasks
    APPROVAL_VIEW: "APPROVAL_VIEW",
    APPROVAL_REQUEST: "APPROVAL_REQUEST",
    APPROVAL_DECIDE: "APPROVAL_DECIDE",
    TASK_VIEW: "TASK_VIEW",
    TASK_CREATE: "TASK_CREATE",
    TASK_UPDATE: "TASK_UPDATE",
    TASK_ASSIGN: "TASK_ASSIGN",

    // Outbox & Integrations
    OUTBOX_VIEW: "OUTBOX_VIEW",
    WEBHOOK_MANAGE: "WEBHOOK_MANAGE",

    // Hierarchical RBAC & Departments
    DEPARTMENT_MANAGE: "DEPARTMENT_MANAGE",
    JOB_ROLE_MANAGE: "JOB_ROLE_MANAGE",

    // Front Desk Expansion (Split Folios, Deposits, No-Shows, Groups, Waitlists)
    FOLIO_SPLIT: "FOLIO_SPLIT",
    FOLIO_ROUTE: "FOLIO_ROUTE",
    FOLIO_TRANSFER: "FOLIO_TRANSFER",
    DEPOSIT_MANAGE: "DEPOSIT_MANAGE",
    NOSHOW_PROCESS: "NOSHOW_PROCESS",
    WAITLIST_MANAGE: "WAITLIST_MANAGE",
    GROUP_BLOCK_MANAGE: "GROUP_BLOCK_MANAGE",

    // Finance, Cashiering & Accounts Payable
    CASHIER_OPEN: "CASHIER_OPEN",
    CASHIER_CLOSE: "CASHIER_CLOSE",
    CASHIER_AUDIT: "CASHIER_AUDIT",
    AR_VIEW: "AR_VIEW",
    AR_MANAGE: "AR_MANAGE",
    AR_PAYMENT: "AR_PAYMENT",
    AP_VIEW: "AP_VIEW",
    AP_MANAGE: "AP_MANAGE",
    AP_PAYMENT: "AP_PAYMENT",

    // Operations, Maintenance & Procurement
    MAINTENANCE_VIEW: "MAINTENANCE_VIEW",
    MAINTENANCE_MANAGE: "MAINTENANCE_MANAGE",
    WORK_ORDER_CREATE: "WORK_ORDER_CREATE",
    PROCUREMENT_VIEW: "PROCUREMENT_VIEW",
    PR_CREATE: "PR_CREATE",
    PO_MANAGE: "PO_MANAGE",
    GRN_RECEIVE: "GRN_RECEIVE",
    STORE_VIEW: "STORE_VIEW",
    STORE_TRANSFER: "STORE_TRANSFER",
    STORE_ADJUST: "STORE_ADJUST",
    LINEN_MANAGE: "LINEN_MANAGE",
    MINIBAR_MANAGE: "MINIBAR_MANAGE",

    // Distribution & Channel Manager
    CHANNEL_VIEW: "CHANNEL_VIEW",
    CHANNEL_MANAGE: "CHANNEL_MANAGE",
    CHANNEL_SYNC: "CHANNEL_SYNC",

    // Sales CRM, Corporate & Communications
    CRM_LEAD_MANAGE: "CRM_LEAD_MANAGE",
    CONTRACT_MANAGE: "CONTRACT_MANAGE",
    COMMUNICATION_VIEW: "COMMUNICATION_VIEW",
    COMMUNICATION_SEND: "COMMUNICATION_SEND",
    TEMPLATE_MANAGE: "TEMPLATE_MANAGE",

    // Loyalty, Reputation & Ancillaries
    LOYALTY_VIEW: "LOYALTY_VIEW",
    LOYALTY_MANAGE: "LOYALTY_MANAGE",
    LOYALTY_REDEEM: "LOYALTY_REDEEM",
    FEEDBACK_VIEW: "FEEDBACK_VIEW",
    SERVICE_RECOVERY_MANAGE: "SERVICE_RECOVERY_MANAGE",

    // Revenue & Multi-Currency
    REVENUE_RESTRICTION_MANAGE: "REVENUE_RESTRICTION_MANAGE",
    CURRENCY_RATE_MANAGE: "CURRENCY_RATE_MANAGE",
    CURRENCY_RATE_VIEW: "CURRENCY_RATE_VIEW",
    RATE_VIEW: "RATE_VIEW",
    RATE_MANAGE: "RATE_MANAGE",

    // Supplemental aliases
    FOLIO_UPDATE: "FOLIO_UPDATE",
    DEPOSIT_VIEW: "DEPOSIT_VIEW",
    DEPOSIT_COLLECT: "DEPOSIT_COLLECT",
    GROUP_VIEW: "GROUP_VIEW",
    GROUP_MANAGE: "GROUP_MANAGE",
    CASHIER_VIEW: "CASHIER_VIEW",
    CASHIER_MANAGE: "CASHIER_MANAGE",
    STORE_MANAGE: "STORE_MANAGE",
    LINEN_VIEW: "LINEN_VIEW",
    MINIBAR_VIEW: "MINIBAR_VIEW",
    CONTRACT_VIEW: "CONTRACT_VIEW",
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
        // Enterprise modules
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.APPROVAL_REQUEST,
        PERMISSIONS.APPROVAL_DECIDE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.OUTBOX_VIEW,
        PERMISSIONS.WEBHOOK_MANAGE,
        PERMISSIONS.DEPARTMENT_MANAGE,
        PERMISSIONS.JOB_ROLE_MANAGE,
        PERMISSIONS.FOLIO_SPLIT,
        PERMISSIONS.FOLIO_ROUTE,
        PERMISSIONS.FOLIO_TRANSFER,
        PERMISSIONS.DEPOSIT_MANAGE,
        PERMISSIONS.NOSHOW_PROCESS,
        PERMISSIONS.WAITLIST_MANAGE,
        PERMISSIONS.GROUP_BLOCK_MANAGE,
        PERMISSIONS.CASHIER_OPEN,
        PERMISSIONS.CASHIER_CLOSE,
        PERMISSIONS.CASHIER_AUDIT,
        PERMISSIONS.AR_VIEW,
        PERMISSIONS.AR_MANAGE,
        PERMISSIONS.AR_PAYMENT,
        PERMISSIONS.AP_VIEW,
        PERMISSIONS.AP_MANAGE,
        PERMISSIONS.AP_PAYMENT,
        PERMISSIONS.MAINTENANCE_VIEW,
        PERMISSIONS.MAINTENANCE_MANAGE,
        PERMISSIONS.WORK_ORDER_CREATE,
        PERMISSIONS.PROCUREMENT_VIEW,
        PERMISSIONS.PR_CREATE,
        PERMISSIONS.PO_MANAGE,
        PERMISSIONS.GRN_RECEIVE,
        PERMISSIONS.STORE_VIEW,
        PERMISSIONS.STORE_TRANSFER,
        PERMISSIONS.STORE_ADJUST,
        PERMISSIONS.LINEN_MANAGE,
        PERMISSIONS.MINIBAR_MANAGE,
        PERMISSIONS.CHANNEL_VIEW,
        PERMISSIONS.CHANNEL_MANAGE,
        PERMISSIONS.CHANNEL_SYNC,
        PERMISSIONS.CRM_LEAD_MANAGE,
        PERMISSIONS.CONTRACT_MANAGE,
        PERMISSIONS.COMMUNICATION_VIEW,
        PERMISSIONS.COMMUNICATION_SEND,
        PERMISSIONS.TEMPLATE_MANAGE,
        PERMISSIONS.LOYALTY_VIEW,
        PERMISSIONS.LOYALTY_MANAGE,
        PERMISSIONS.LOYALTY_REDEEM,
        PERMISSIONS.FEEDBACK_VIEW,
        PERMISSIONS.SERVICE_RECOVERY_MANAGE,
        PERMISSIONS.REVENUE_RESTRICTION_MANAGE,
        PERMISSIONS.CURRENCY_RATE_MANAGE,
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
        PERMISSIONS.DEPARTMENT_MANAGE,
        PERMISSIONS.JOB_ROLE_MANAGE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
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
        PERMISSIONS.FOLIO_SPLIT,
        PERMISSIONS.FOLIO_ROUTE,
        PERMISSIONS.FOLIO_TRANSFER,
        PERMISSIONS.DEPOSIT_MANAGE,
        PERMISSIONS.NOSHOW_PROCESS,
        PERMISSIONS.WAITLIST_MANAGE,
        PERMISSIONS.GROUP_BLOCK_MANAGE,
        PERMISSIONS.CASHIER_OPEN,
        PERMISSIONS.CASHIER_CLOSE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.MINIBAR_MANAGE,
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
        PERMISSIONS.CASHIER_AUDIT,
        PERMISSIONS.AR_VIEW,
        PERMISSIONS.AR_MANAGE,
        PERMISSIONS.AR_PAYMENT,
        PERMISSIONS.AP_VIEW,
        PERMISSIONS.AP_MANAGE,
        PERMISSIONS.AP_PAYMENT,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.APPROVAL_DECIDE,
        PERMISSIONS.CURRENCY_RATE_MANAGE,
    ],
    HOUSEKEEPING: [
        PERMISSIONS.ROOM_VIEW,
        PERMISSIONS.ROOM_UPDATE,
        PERMISSIONS.HOUSEKEEPING_VIEW,
        PERMISSIONS.HOUSEKEEPING_MANAGE,
        PERMISSIONS.LOST_FOUND_VIEW,
        PERMISSIONS.LOST_FOUND_MANAGE,
        PERMISSIONS.LINEN_MANAGE,
        PERMISSIONS.MINIBAR_MANAGE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.WORK_ORDER_CREATE,
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
