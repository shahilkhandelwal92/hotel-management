/**
 * Health Monitoring Dashboard API
 * GET /api/health/dashboard?hotelId=
 * Returns operational metrics: pending audits, low stock, failed payments, today's checkins
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";



export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.REPORT_FINANCIAL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    const timezone = hotel?.timezone || "Asia/Kolkata";

    const today = new Date();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const [
        todayCheckIns,
        todayCheckOuts,
        pendingNightAudit,
        unpaidInvoices,
        failedPayments,
        lowStock,
        openFolios,
        pendingOvertime,
        roomStatus,
        recentAuditAlerts,
        unapprovedPayroll,
        unassignedReservations,
        negativeFolios,
        // Smart Access KPIs
        activeCredentials,
        expiringToday,
        deniedEntries24h,
        staffLateCheckIns,
    ] = await Promise.all([
        // Today's check-ins
        prisma.reservation.count({
            where: { hotelId, checkIn: { gte: today, lte: todayEnd }, deletedAt: null, status: { in: ["Confirmed", "CheckedIn"] } },
        }),

        // Today's check-outs
        prisma.reservation.count({
            where: { hotelId, checkOut: { gte: today, lte: todayEnd }, deletedAt: null },
        }),

        // Night audit pending? Check if today is NOT closed
        prisma.nightAudit.findFirst({
            where: { hotelId, auditDate: today },
            select: { id: true, isDayClosed: true, status: true },
        }),

        // Unpaid invoices overdue
        prisma.invoice.count({
            where: { hotelId, status: "Unpaid", dueDate: { lt: new Date() }, deletedAt: null },
        }),

        // Payments in unexpected states
        prisma.payment.count({
            where: { hotelId, reconciliationStatus: "Failed" },
        }),

        // Low stock alerts
        prisma.groceryStock.findMany({
            where: { hotelId },
            select: { id: true, itemName: true, quantity: true, minAlert: true, unit: true },
        }),

        // Open folios with positive balance
        prisma.folio.count({
            where: { hotelId, status: "Open", balance: { gt: 0 } },
        }),

        // Pending overtime approvals
        prisma.overtime.count({
            where: { hotelId, status: "Pending" },
        }),

        // Room status distribution
        prisma.room.groupBy({
            by: ["status"],
            where: { hotelId },
            _count: { status: true },
        }),

        // Recent security alerts from audit log
        prisma.auditLog.findMany({
            where: {
                hotelId,
                action: { in: ["OVERBOOK_ATTEMPT", "DELETE", "NIGHT_AUDIT_REOPEN"] },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { action: true, module: true, entityId: true, createdAt: true, ipAddress: true },
        }),

        // Unapproved payroll records
        prisma.payrollRecord.count({
            where: { hotelId, paymentStatus: { in: ["Draft", "Pending", "PendingApproval"] } },
        }),

        // Reservations without a room assigned (walk-in / unassigned)
        prisma.reservation.count({
            where: { hotelId, roomId: null, status: { notIn: ["Cancelled", "CheckedOut"] }, deletedAt: null },
        }),

        // Open folios with negative balance (potential discrepancy / over-refund)
        prisma.folio.count({
            where: { hotelId, status: "Open", balance: { lt: 0 } },
        }),

        // Smart Access: Active credentials
        prisma.accessCredential.count({ where: { hotelId, status: "Active" } }).catch(() => 0),
        // Smart Access: Keys expiring in next 24 hours
        prisma.accessCredential.count({
            where: { hotelId, status: "Active", validUntil: { gte: new Date(), lt: new Date(Date.now() + 86400000) } },
        }).catch(() => 0),
        // Smart Access: Denied entries in last 24 hours
        prisma.accessLog.count({
            where: { hotelId, action: "DENIED", timestamp: { gte: new Date(Date.now() - 86400000) } },
        }).catch(() => 0),
        // Smart Access: Staff late check-ins today (checked in after 09:30)
        prisma.staffAttendanceLog.count({
            where: {
                hotelId, action: "CHECK_IN",
                createdAt: { gte: new Date(new Date().setHours(9, 30, 0, 0)), lte: todayEnd },
            },
        }).catch(() => 0),
    ]);

    // Process low stock
    const lowStockAlerts = lowStock
        .filter((s) => s.quantity <= s.minAlert)
        .map((s) => ({
            id: s.id,
            itemName: s.itemName,
            quantity: s.quantity,
            minAlert: s.minAlert,
            unit: s.unit,
            severity: s.quantity <= 0 ? "Critical" : s.quantity <= s.minAlert / 2 ? "High" : "Medium",
        }));

    // Room metrics
    const roomMetrics = roomStatus.reduce(
        (acc: Record<string, number>, row) => { acc[row.status] = row._count.status; return acc; },
        {}
    );

    const nightAuditStatus = pendingNightAudit
        ? pendingNightAudit.isDayClosed
            ? "Closed ✅"
            : "Open ⚠️"
        : "Not Started ❌";

    return NextResponse.json({
        hotel: hotelId,
        generatedAt: new Date().toISOString(),

        // ── KPIs ──────────────────────────────────────────────────
        kpis: {
            todayCheckIns,
            todayCheckOuts,
            openFolios,
            unpaidOverdueInvoices: unpaidInvoices,
            failedPayments,
            pendingOvertimeApprovals: pendingOvertime,
            unapprovedPayrollCount: unapprovedPayroll,
            reservationsWithoutRoom: unassignedReservations,
            negativeFolioCount: negativeFolios,
        },

        // ── Smart Access ──────────────────────────────────────────
        smartAccess: {
            activeCredentials,
            expiringToday,
            deniedEntries24h,
            staffLateCheckIns,
        },

        // ── Alerts ────────────────────────────────────────────────
        alerts: {
            nightAuditStatus,
            nightAuditDayClosed: pendingNightAudit?.isDayClosed ?? false,
            lowStockCount: lowStockAlerts.length,
            lowStockAlerts,
            securityAlerts: recentAuditAlerts,
        },

        // ── Rooms ─────────────────────────────────────────────────
        rooms: roomMetrics,
    });
}
