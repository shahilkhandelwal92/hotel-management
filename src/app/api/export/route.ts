/**
 * Data Export API — CSV exports for reservations, GST, payroll, analytics
 * GET /api/export?type=reservations|gst|payroll|analytics&hotelId=&from=&to=
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { formatHotelBusinessDate, DEFAULT_HOTEL_TIMEZONE } from "@/lib/timezone";

function toCSV(rows: Record<string, unknown>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
        const s = v == null ? "" : String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
    };
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "reservations";

    // Map export type to authoritative permission
    const requiredPermission =
        type === "payroll" ? PERMISSIONS.EXPORT_PAYROLL_DATA :
        (type === "gst" || type === "analytics") ? PERMISSIONS.EXPORT_FINANCIAL_DATA :
        PERMISSIONS.EXPORT_GUEST_DATA;

    const auth = await requirePermission(req, requiredPermission);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 403 });

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    const timezone = hotel?.timezone || DEFAULT_HOTEL_TIMEZONE;

    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86400000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

    let rows: Record<string, unknown>[] = [];
    const filename = `${type}_export_${formatHotelBusinessDate(new Date(), timezone)}`;

    // ── RESERVATIONS ─────────────────────────────────────────────
    if (type === "reservations") {
        const data = await prisma.reservation.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
            include: { room: { select: { number: true, type: true } } },
            orderBy: { createdAt: "desc" },
        });
        rows = data.map((r) => ({
            "Booking Ref": r.bookingRef,
            "Guest Name": r.guestName,
            "Guest Email": r.guestEmail,
            "Guest Phone": r.guestPhone,
            "Room Number": r.room?.number ?? "Unassigned",
            "Room Type": r.room?.type ?? "—",
            "Check-In": formatHotelBusinessDate(r.checkIn, timezone),
            "Check-Out": formatHotelBusinessDate(r.checkOut, timezone),
            "Status": r.status,
            "Total Amount": Number(r.totalAmount).toFixed(2),
            "Advance Deposit": Number(r.advanceDeposit).toFixed(2),
            "Balance Due": Number(r.balanceDue).toFixed(2),
            "Booking Source": r.bookingType,
            "Booked On": formatHotelBusinessDate(r.createdAt, timezone),
        }));
    }

    // ── GST REPORT ───────────────────────────────────────────────
    if (type === "gst") {
        const invoices = await prisma.invoice.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to }, deletedAt: null },
            include: { items: true },
            orderBy: { createdAt: "asc" },
        });
        rows = invoices.map((inv) => ({
            "Invoice Number": inv.invoiceNumber,
            "Invoice Date": formatHotelBusinessDate(inv.createdAt, timezone),
            "Billed To": inv.billedToName,
            "GSTIN": inv.billedToGstin ?? "Unregistered (B2C)",
            "State": inv.billedToState ?? "—",
            "Format": inv.invoiceFormat,
            "Taxable Value": Number(inv.subTotal).toFixed(2),
            "CGST (₹)": Number(inv.cgst).toFixed(2),
            "SGST (₹)": Number(inv.sgst).toFixed(2),
            "IGST (₹)": Number(inv.igst).toFixed(2),
            "Total Tax (₹)": Number(inv.totalTax).toFixed(2),
            "Grand Total (₹)": Number(inv.grandTotal).toFixed(2),
            "Payment Status": inv.status,
            "Reverse Charge": inv.isReverseCharge ? "Yes" : "No",
        }));
    }

    // ── PAYROLL ──────────────────────────────────────────────────
    if (type === "payroll") {
        const records = await prisma.payrollRecord.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
        });
        rows = records.map((p) => ({
            "Employee Name": p.user?.name ?? "—",
            "Email": p.user?.email ?? "—",
            "Month": p.month,
            "Working Days": p.workingDays,
            "LOP Days": p.lopDays,
            "Basic Salary": Number(p.basicSalary).toFixed(2),
            "HRA": Number(p.hra).toFixed(2),
            "Other Allowances": Number(p.otherAllowances).toFixed(2),
            "Gross Salary": Number(p.grossSalary).toFixed(2),
            "PF Deduction": Number(p.pf).toFixed(2),
            "ESI Deduction": Number(p.esi).toFixed(2),
            "Professional Tax": Number(p.pt).toFixed(2),
            "TDS": Number(p.tds).toFixed(2),
            "Total Deductions": Number(p.totalDeductions).toFixed(2),
            "Net Salary": Number(p.netSalary).toFixed(2),
            "Status": p.paymentStatus,
            "Payment Date": p.paymentDate ? formatHotelBusinessDate(p.paymentDate, timezone) : "Pending",
        }));
    }

    // ── ANALYTICS / DAILY REVENUE ────────────────────────────────
    if (type === "analytics") {
        const audits = await prisma.nightAudit.findMany({
            where: { hotelId, createdAt: { gte: from, lte: to } },
            orderBy: { auditDate: "asc" },
        });
        rows = audits.map((a) => ({
            "Audit Date": formatHotelBusinessDate(a.auditDate, timezone),
            "Total Rooms": a.totalRooms,
            "Occupied Rooms": a.occupiedRooms,
            "Occupancy %": `${a.occupancyPct}%`,
            "Room Revenue": Number(a.roomRevenue).toFixed(2),
            "F&B Revenue": Number(a.fbRevenue).toFixed(2),
            "Amenity Revenue": Number(a.amenityRevenue).toFixed(2),
            "Event Revenue": Number(a.eventRevenue).toFixed(2),
            "Other Revenue": Number(a.otherRevenue).toFixed(2),
            "Total Revenue": Number(a.totalRevenue).toFixed(2),
            "ADR": (a.occupiedRooms > 0 ? (Number(a.roomRevenue) / a.occupiedRooms).toFixed(2) : "0.00"),
            "RevPAR": (a.totalRooms > 0 ? (Number(a.roomRevenue) / a.totalRooms).toFixed(2) : "0.00"),
        }));
    }

    await logAudit({
        hotelId,
        userId: auth.userId,
        module: "Export",
        action: "EXPORT_DATA",
        entityId: `${type}_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`,
        newValue: { type, rowCount: rows.length },
        req,
    });

    const csv = toCSV(rows);
    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
    });
}
