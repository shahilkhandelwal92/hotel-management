import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
    CREATE: { icon: "✅", label: "Created", color: "#10b981" },
    UPDATE: { icon: "✏️", label: "Updated", color: "#6366f1" },
    DELETE: { icon: "🗑️", label: "Deleted", color: "#ef4444" },
    APPROVE: { icon: "✅", label: "Approved", color: "#10b981" },
    REJECT: { icon: "❌", label: "Rejected", color: "#ef4444" },
    PAYMENT_RECEIVED: { icon: "💰", label: "Payment Received", color: "#f59e0b" },
    PAYMENT_CANCELLED: { icon: "🔙", label: "Payment Cancelled", color: "#f59e0b" },
    CHECKIN: { icon: "🏨", label: "Check-In", color: "#22d3ee" },
    CHECKOUT: { icon: "👋", label: "Check-Out", color: "#818cf8" },
    CREDIT_NOTE_ISSUED: { icon: "📄", label: "Credit Note Issued", color: "#a3e635" },
    NIGHT_AUDIT_CLOSE: { icon: "🔒", label: "Night Audit Closed", color: "#475569" },
    NIGHT_AUDIT_REOPEN: { icon: "🔓", label: "Night Audit Reopened", color: "#ef4444" },
    OVERBOOK_ATTEMPT: { icon: "⚠️", label: "Overbook Attempt", color: "#ef4444" },
};

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.REPORT_FINANCIAL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const hotelId = tenant.hotelId;
    const moduleName = searchParams.get("module");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    if (!entityId && !hotelId) {
        return NextResponse.json({ error: "entityId or hotel context required" }, { status: 400 });
    }

    const where: Prisma.AuditLogWhereInput = {};
    if (entityId) where.entityId = entityId;
    if (hotelId) where.hotelId = hotelId;
    if (moduleName) where.module = moduleName;

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true, module: true, action: true, entityId: true, entityType: true,
            oldValue: true, newValue: true, ipAddress: true, createdAt: true,
            user: { select: { id: true, name: true, email: true } },
        },
    });

    const timeline = logs.map((log) => ({
        ...log,
        meta: ACTION_META[log.action] ?? { icon: "📋", label: log.action, color: "#64748b" },
        hasDiff: log.oldValue !== null && log.newValue !== null,
    }));

    return NextResponse.json({ timeline, total: timeline.length });
}
