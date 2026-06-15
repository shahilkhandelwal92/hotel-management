import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";
import { assertDayNotLocked, logAudit } from "@/lib/audit";
import {
    calculateInvoiceTotals,
    InvoiceItemInput,
    InvoiceValidationError,
    isValidGstin,
} from "@/lib/invoice";
import type { Prisma } from "@prisma/client";

const BILLING_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "ACCOUNTING", "BILLING"];

async function generateInvoiceNumber(hotelId: string, type: string): Promise<string> {
    const prefix = type === "CREDIT_NOTE" ? "CN" : type === "PROFORMA" ? "PI" : "INV";
    const count = await prisma.invoice.count({ where: { hotelId } });
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financialYear = `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
    const hotelCode = hotelId.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X");
    return `${prefix}${financialYear}${hotelCode}${String(count + 1).padStart(5, "0")}`;
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(session, BILLING_ROLES)) {
        return NextResponse.json({ error: "Billing access required" }, { status: 403 });
    }

    // Tenant isolation: ALWAYS use header injected by middleware
    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";

    const { searchParams } = new URL(req.url);
    // SA can filter by any hotelId; staff locked to own hotel from header
    const hotelId = isSA ? searchParams.get("hotelId") : injectedHotelId;
    if (!isSA && !hotelId) {
        return NextResponse.json({ error: "Hotel context missing" }, { status: 403 });
    }

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

// ── POST (create invoice) ────────────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(session, BILLING_ROLES)) {
        return NextResponse.json({ error: "Billing access required" }, { status: 403 });
    }

    // NEVER trust body.hotelId — always derive from middleware header
    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";

    const body = await req.json();
    const {
        reservationId, invoiceType, billedToName, billedToEmail, billedToPhone,
        billedToAddress, billedToGstin, billedToState, items, notes, dueDate,
        isReverseCharge = false, isExempt = false, creditNoteForId,
    } = body;

    // Resolve hotel — staff always scoped to their hotel
    const hotelId = isSA ? (body.hotelId ?? injectedHotelId) : injectedHotelId;
    if (!hotelId) return NextResponse.json({ error: "Hotel context missing" }, { status: 403 });
    if (!billedToName || !items?.length) {
        return NextResponse.json({ error: "Missing required fields: billedToName, items" }, { status: 400 });
    }
    if (billedToGstin && !isValidGstin(billedToGstin)) {
        return NextResponse.json({ error: "Invalid GSTIN" }, { status: 400 });
    }

    // ── Night Audit Lock ────────────────────────────────────────
    // Block invoice creation for past closed days
    const guard = await assertDayNotLocked(hotelId, new Date(), isSA);
    if (guard) return NextResponse.json({ error: guard }, { status: 423 }); // 423 Locked

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

    // B2B vs B2C invoice format
    const invoiceFormat = billedToGstin ? "B2B" : "B2C";

    try {
        let invoice = null;
        let invoiceNumber = "";

        for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
            invoiceNumber = await generateInvoiceNumber(hotelId, invoiceType || "TAX");
            try {
                invoice = await prisma.invoice.create({
                    data: {
                        invoiceNumber, invoiceType: invoiceType || "TAX", hotelId,
                        reservationId: reservationId || null,
                        billedToName, billedToEmail, billedToPhone, billedToAddress, billedToGstin, billedToState,
                        subTotal: totals.subTotal,
                        cgst: totals.cgst,
                        sgst: totals.sgst,
                        igst: totals.igst,
                        totalTax: totals.totalTax,
                        grandTotal: totals.grandTotal,
                        roundOff: totals.roundOff,
                        invoiceFormat, isReverseCharge, isExempt,
                        creditNoteForId: creditNoteForId || null,
                        status: "Unpaid", notes,
                        dueDate: dueDate ? new Date(dueDate) : null,
                        items: {
                            create: totals.processedItems,
                        },
                    },
                    include: { items: true },
                });
            } catch (error: unknown) {
                const isUniqueConflict =
                    typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    error.code === "P2002";
                if (!isUniqueConflict || attempt === 2) throw error;
            }
        }

        if (!invoice) throw new Error("Unable to allocate invoice number");

        await logAudit({
            hotelId,
            userId: session.user.id as string,
            module: "Invoice",
            action: "CREATE",
            entityId: invoice.id,
            newValue: { invoiceNumber, grandTotal: invoice.grandTotal, invoiceFormat },
            req,
        });

        return NextResponse.json({ invoice }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }
}

// ── PUT (update status, soft delete) ─────────────────────────
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(session, BILLING_ROLES)) {
        return NextResponse.json({ error: "Billing access required" }, { status: 403 });
    }

    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";

    const { id, status, action } = await req.json();

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!isSA && existing.hotelId !== injectedHotelId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Night audit lock — check if the invoice's day is closed
    const guard = await assertDayNotLocked(existing.hotelId, new Date(existing.createdAt), isSA);
    if (guard) return NextResponse.json({ error: guard }, { status: 423 });

    if (action === "delete") {
        // Soft delete only — front desk cannot hard delete
        await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: session.user.id as string,
            module: "Invoice",
            action: "DELETE",
            entityId: id,
            oldValue: { invoiceNumber: existing.invoiceNumber, grandTotal: existing.grandTotal },
            req,
        });
        return NextResponse.json({ success: true });
    }

    if (!["Unpaid", "Partial", "Paid", "Cancelled"].includes(status)) {
        return NextResponse.json({ error: "Invalid invoice status" }, { status: 400 });
    }

    const updated = await prisma.invoice.update({
        where: { id },
        data: { status },
    });

    await logAudit({
        hotelId: existing.hotelId,
        userId: session.user.id as string,
        module: "Invoice",
        action: "UPDATE",
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        req,
    });
    return NextResponse.json({ invoice: updated });
}
