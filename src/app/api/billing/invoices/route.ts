import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertDayNotLocked, logAudit } from "@/lib/audit";
import {
    calculateInvoiceTotals,
    InvoiceItemInput,
    InvoiceValidationError,
    isValidGstin,
} from "@/lib/invoice";
import { generateNextInvoiceNumber } from "@/lib/invoiceSequence";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

// ── GET (List Invoices) ──────────────────────────────────────
export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.INVOICE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const reservationId = searchParams.get("reservationId");

    const where: Prisma.InvoiceWhereInput = { deletedAt: null };
    if (hotelId) where.hotelId = hotelId;
    if (type) where.invoiceType = type;
    if (status) where.status = status;
    if (reservationId) where.reservationId = reservationId;

    try {
        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                items: true,
                payments: true,
                reservation: { select: { bookingRef: true, guestName: true, checkIn: true, checkOut: true } },
                creditNotes: { select: { id: true, invoiceNumber: true, grandTotal: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ invoices });
    } catch {
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}

// ── POST (Create Invoice) ────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.INVOICE_CREATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) {
        return NextResponse.json({ error: "Hotel context missing" }, { status: 403 });
    }

    const body = await req.json();
    const {
        reservationId, invoiceType, billedToName, billedToEmail, billedToPhone,
        billedToAddress, billedToGstin, billedToState, items, notes, dueDate,
        isReverseCharge = false, isExempt = false, creditNoteForId,
    } = body;

    if (!billedToName || !items?.length) {
        return NextResponse.json({ error: "Missing required fields: billedToName, items" }, { status: 400 });
    }
    if (billedToGstin && !isValidGstin(billedToGstin)) {
        return NextResponse.json({ error: "Invalid GSTIN format" }, { status: 400 });
    }

    // ── Night Audit Lock Check ──────────────────────────────────
    const guard = await assertDayNotLocked(hotelId, new Date(), auth.roles.includes("SUPER_ADMIN"));
    if (guard) return NextResponse.json({ error: guard }, { status: 423 });

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

    if (reservationId) {
        const reservation = await prisma.reservation.findFirst({
            where: { id: reservationId, hotelId, deletedAt: null },
            select: { id: true },
        });
        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found for this hotel" }, { status: 404 });
        }
    }

    if (creditNoteForId) {
        const originalInvoice = await prisma.invoice.findFirst({
            where: { id: creditNoteForId, hotelId, deletedAt: null },
            select: { id: true },
        });
        if (!originalInvoice) {
            return NextResponse.json({ error: "Original invoice not found for this hotel" }, { status: 404 });
        }
    }

    const isInterState = Boolean(
        hotel.state &&
        billedToState &&
        hotel.state.trim().toLowerCase() !== billedToState.trim().toLowerCase()
    );

    let totals;
    try {
        totals = calculateInvoiceTotals(items as InvoiceItemInput[], { isInterState, isExempt });
    } catch (error) {
        if (error instanceof InvoiceValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }

    const invoiceFormat = billedToGstin ? "B2B" : "B2C";
    const prefix = invoiceType === "CREDIT_NOTE" ? "CN" : invoiceType === "PROFORMA" ? "PI" : "INV";

    try {
        const invoice = await prisma.$transaction(async (tx) => {
            const invoiceNumber = await generateNextInvoiceNumber({
                hotelId,
                prefix,
                tx,
            });

            return tx.invoice.create({
                data: {
                    invoiceNumber,
                    invoiceType: invoiceType || "TAX",
                    hotelId,
                    reservationId: reservationId || null,
                    billedToName,
                    billedToEmail,
                    billedToPhone,
                    billedToAddress,
                    billedToGstin,
                    billedToState,
                    subTotal: totals.subTotal,
                    cgst: totals.cgst,
                    sgst: totals.sgst,
                    igst: totals.igst,
                    totalTax: totals.totalTax,
                    grandTotal: totals.grandTotal,
                    roundOff: totals.roundOff,
                    invoiceFormat,
                    isReverseCharge,
                    isExempt,
                    creditNoteForId: creditNoteForId || null,
                    status: "Unpaid",
                    notes,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    items: {
                        create: totals.processedItems,
                    },
                },
                include: { items: true },
            });
        });

        await logAudit({
            hotelId,
            userId: auth.userId,
            module: "Invoice",
            action: "CREATE",
            entityId: invoice.id,
            newValue: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal.toString(), invoiceFormat },
            req,
        });

        return NextResponse.json({ invoice }, { status: 201 });
    } catch (err) {
        console.error("Failed to create invoice:", err);
        return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }
}

// ── PUT (Update Status / Cancellation) ────────────────────────
export async function PUT(req: NextRequest) {
    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const body = await req.json();
    const { id, status, action, notes } = body;

    if (!id) return NextResponse.json({ error: "Invoice id required" }, { status: 400 });

    const invoice = await prisma.invoice.findFirst({
        where: { id, ...(hotelId ? { hotelId } : {}), deletedAt: null },
        include: { payments: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Handle cancellation
    if (action === "cancel") {
        const cancelAuth = await requirePermission(req, PERMISSIONS.INVOICE_CANCEL);
        if (cancelAuth instanceof NextResponse) return cancelAuth;

        if (invoice.status === "Paid") {
            return NextResponse.json({ error: "Paid invoices cannot be cancelled directly. Issue a Credit Note instead." }, { status: 422 });
        }
        if (invoice.status === "Cancelled") {
            return NextResponse.json({ error: "Invoice is already cancelled" }, { status: 422 });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: { status: "Cancelled", notes: notes ? `${invoice.notes ? invoice.notes + " | " : ""}Cancelled: ${notes}` : invoice.notes },
        });

        await logAudit({
            hotelId: invoice.hotelId,
            userId: tenant.userId,
            module: "Invoice",
            action: "CANCEL",
            entityId: invoice.id,
            oldValue: { status: invoice.status },
            newValue: { status: "Cancelled", notes },
            req,
        });

        return NextResponse.json({ invoice: updated });
    }

    // Direct status modification: do NOT allow setting 'Paid' without payment settlement
    if (status) {
        const updateAuth = await requirePermission(req, PERMISSIONS.INVOICE_UPDATE);
        if (updateAuth instanceof NextResponse) return updateAuth;

        if (status === "Paid" && invoice.status !== "Paid") {
            // Check if actual payments cover the grandTotal
            const totalPaid = invoice.payments.reduce((sum, p) => sum.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));
            if (totalPaid.lessThan(invoice.grandTotal)) {
                return NextResponse.json({
                    error: `Cannot mark invoice as Paid without recording payment settlement. Paid: ${totalPaid.toString()}, Grand Total: ${invoice.grandTotal.toString()}.`,
                }, { status: 422 });
            }
        }

        const validStatuses = ["Unpaid", "Partial", "Paid", "Draft"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: `Invalid status '${status}'. Valid statuses: ${validStatuses.join(", ")}` }, { status: 400 });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: { status },
        });

        await logAudit({
            hotelId: invoice.hotelId,
            userId: tenant.userId,
            module: "Invoice",
            action: "UPDATE",
            entityId: invoice.id,
            oldValue: { status: invoice.status },
            newValue: { status: updated.status },
            req,
        });

        return NextResponse.json({ invoice: updated });
    }

    return NextResponse.json({ error: "No update action or valid status specified" }, { status: 400 });
}
