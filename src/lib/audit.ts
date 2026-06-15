/**
 * audit.ts
 * ──────────────────────────────────────────────────────────────────────
 * Centralized audit logging helper.
 *
 * USAGE in APIs:
 *   await logAudit({
 *     hotelId: "...",
 *     userId: session.user.id,
 *     module: "Invoice",
 *     action: "DELETE",
 *     entityId: invoice.id,
 *     oldValue: invoiceBefore,
 *     newValue: null,
 *     req,           // NextRequest — auto-extracts IP and User-Agent
 *   });
 */

import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";



export type AuditAction =
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "APPROVE"
    | "REJECT"
    | "CHECKIN"
    | "CHECKOUT"
    | "CANCEL"
    | "LOGIN"
    | "LOGOUT"
    | "NIGHT_AUDIT_CLOSE"
    | "NIGHT_AUDIT_REOPEN"
    | "PAYROLL_PROCESS"
    | "PAYROLL_APPROVE"
    | "INVOICE_CREDIT_NOTE"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_CANCELLED"
    | "CREDIT_NOTE_ISSUED"
    | "OVERBOOK_ATTEMPT"
    | "DENIED_UNKNOWN_CREDENTIAL"
    | "DENIED_ENTRY";

export type AuditModule =
    | "Reservation"
    | "Invoice"
    | "Payment"
    | "Folio"
    | "Payroll"
    | "Room"
    | "User"
    | "GuestCRMProfile"
    | "HousekeepingTask"
    | "NightAudit"
    | "RatePlan"
    | "SaasSubscription"
    | "Auth"
    | "AccessCredential"
    | "AccessLog";

export interface LogAuditParams {
    hotelId?: string | null;
    userId?: string | null;
    module: AuditModule;
    action: AuditAction;
    entityType?: string;
    entityId?: string | null;
    oldValue?: object | null;
    newValue?: object | null;
    details?: string;
    req?: NextRequest;
}

/**
 * Write an immutable audit log entry.
 * This function is fire-and-forget safe — errors are swallowed to never break the main flow.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
    try {
        const ipAddress =
            params.req?.headers.get("x-forwarded-for") ??
            params.req?.headers.get("x-real-ip") ??
            null;

        const userAgent = params.req?.headers.get("user-agent") ?? null;

        await prisma.auditLog.create({
            data: {
                hotelId: params.hotelId ?? null,
                userId: params.userId ?? null,
                module: params.module,
                action: params.action,
                entityType: params.entityType ?? params.module,
                entityId: params.entityId ?? null,
                oldValue: params.oldValue ?? undefined,
                newValue: params.newValue ?? undefined,
                details: params.details ?? null,
                ipAddress,
                userAgent,
            },
        });
    } catch (err) {
        // Never crash the main request due to audit logging failure
        console.error("[AuditLog] Failed to write log:", err);
    }
}

/**
 * Check if a specific day is locked (night audit closed).
 * Returns an error message string if locked, null if OK to proceed.
 * Never throws — callers handle the response.
 */
export async function assertDayNotLocked(
    hotelId: string,
    date: Date,
    isSuperAdmin: boolean,
    overrideReason?: string
): Promise<string | null> {
    const auditDate = new Date(date);
    auditDate.setHours(0, 0, 0, 0);

    const nightAudit = await prisma.nightAudit.findUnique({
        where: { hotelId_auditDate: { hotelId, auditDate } },
    });

    if (!nightAudit?.isDayClosed) return null; // Day is open — proceed

    if (!isSuperAdmin) {
        return `Day ${auditDate.toLocaleDateString("en-IN")} is locked by Night Audit. Super Admin override required.`;
    }

    if (!overrideReason) {
        return "Admin override required: please provide a reason for editing a closed day.";
    }

    // Log the admin override action
    await prisma.auditLog.create({
        data: {
            hotelId,
            module: "NightAudit",
            action: "NIGHT_AUDIT_REOPEN",
            entityId: nightAudit.id,
            details: `Admin override: ${overrideReason}`,
        },
    });

    return null; // SA with reason — proceed
}
