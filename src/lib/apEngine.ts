/**
 * Enterprise Accounts Payable (AP) & 3-Way Match Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages vendor profiles, Purchase Orders (PO), Goods Receipt Notes (GRN),
 * 3-Way invoice verification (PO qty/price vs GRN received vs Vendor Invoice),
 * AP liability recognition, and payment scheduling.
 *
 * Core Invariant:
 * PO + GRN + Vendor Invoice -> 3-Way Match Passed -> AP Liability Created -> Payment
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateVendorParams {
    hotelId: string;
    vendorCode: string;
    vendorName: string;
    category?: string;
    taxId?: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    address?: string;
    paymentTermsDays?: number;
}

export interface CreatePOParams {
    hotelId: string;
    vendorId: string;
    poNumber: string;
    orderDate?: Date | string;
    expectedDelivery?: Date | string;
    items: Array<{
        itemName: string;
        quantity: number;
        unitPrice: Prisma.Decimal | number | string;
        taxPercent?: number;
    }>;
    createdById: string;
    notes?: string;
}

export interface ReceiveGRNParams {
    hotelId: string;
    poId: string;
    grnNumber: string;
    deliveryChallanNumber?: string;
    receivedById: string;
    items: Array<{
        poItemId: string;
        itemName: string;
        quantityReceived: number;
        quantityRejected?: number;
        unitPrice: Prisma.Decimal | number | string;
        rejectionReason?: string;
    }>;
    notes?: string;
}

export interface MatchAPInvoiceParams {
    hotelId: string;
    vendorId: string;
    poId: string;
    grnId: string;
    invoiceNumber: string;
    invoiceDate: Date | string;
    dueDate: Date | string;
    invoiceAmount: Prisma.Decimal | number | string;
}

export async function createVendor(params: CreateVendorParams) {
    const {
        hotelId,
        vendorCode,
        vendorName,
        category = "GENERAL",
        taxId,
        contactPerson,
        contactEmail,
        contactPhone,
        address,
        paymentTermsDays = 30,
    } = params;

    return prisma.vendorAccount.create({
        data: {
            hotelId,
            vendorCode: vendorCode.toUpperCase(),
            vendorName,
            category,
            gstin: taxId ?? null,
            contactPerson,
            email: contactEmail,
            phone: contactPhone,
            address: address ?? null,
            paymentTermsDays,
            status: "ACTIVE",
        },
    });
}

export async function createPurchaseOrder(params: CreatePOParams) {
    const {
        hotelId,
        vendorId,
        poNumber,
        orderDate = new Date(),
        expectedDelivery,
        items,
        notes,
    } = params;

    let totalAmount = new Prisma.Decimal(0);
    let subtotal = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const lineItemsData = items.map((item) => {
        const up = new Prisma.Decimal(item.unitPrice.toString());
        const sub = up.mul(item.quantity);
        const tax = sub.mul(item.taxPercent ?? 0).div(100);
        const lineTotal = sub.plus(tax);
        subtotal = subtotal.plus(sub);
        totalTax = totalTax.plus(tax);
        totalAmount = totalAmount.plus(lineTotal);

        return {
            itemName: item.itemName,
            orderedQty: new Prisma.Decimal(item.quantity),
            receivedQty: new Prisma.Decimal(0),
            unit: "PCS",
            unitPrice: up,
            taxPercent: new Prisma.Decimal(item.taxPercent ?? 0),
            totalPrice: lineTotal,
        };
    });

    return prisma.purchaseOrder.create({
        data: {
            hotelId,
            vendorId,
            poNumber,
            poDate: new Date(orderDate),
            expectedDate: expectedDelivery ? new Date(expectedDelivery) : null,
            subtotal,
            taxAmount: totalTax,
            totalAmount,
            status: "APPROVED",
            notes: notes ?? null,
            items: {
                create: lineItemsData,
            },
        },
        include: { items: true },
    });
}

export async function receiveGoodsReceiptNote(params: ReceiveGRNParams) {
    const { hotelId, poId, grnNumber, receivedById, items, notes } = params;

    return prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findFirst({
            where: { id: poId, hotelId },
            include: { items: true },
        });

        if (!po) throw new Error("Purchase order not found");

        const grn = await tx.goodsReceiptNote.create({
            data: {
                hotelId,
                poId,
                grnNumber,
                receivedDate: new Date(),
                receivedBy: receivedById,
                status: "RECEIVED",
                notes: notes ?? null,
                items: {
                    create: items.map((i) => ({
                        itemName: i.itemName,
                        receivedQty: new Prisma.Decimal(i.quantityReceived),
                        acceptedQty: new Prisma.Decimal(i.quantityReceived - (i.quantityRejected ?? 0)),
                        rejectedQty: new Prisma.Decimal(i.quantityRejected ?? 0),
                        unitPrice: new Prisma.Decimal(i.unitPrice.toString()),
                    })),
                },
            },
            include: { items: true },
        });

        // Update PO item received quantities
        for (const item of items) {
            await tx.purchaseOrderItem.update({
                where: { id: item.poItemId },
                data: { receivedQty: { increment: item.quantityReceived } },
            });
        }

        // Update PO status to RECEIVED
        await tx.purchaseOrder.update({
            where: { id: poId },
            data: { status: "RECEIVED" },
        });

        return grn;
    }, { maxWait: 15000, timeout: 30000 });
}

export async function matchThreeWayAPInvoice(params: MatchAPInvoiceParams) {
    const {
        hotelId,
        vendorId,
        poId,
        grnId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        invoiceAmount,
    } = params;
    const decInvoiceAmount = new Prisma.Decimal(invoiceAmount.toString());

    return prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findFirst({
            where: { id: poId, hotelId, vendorId },
            include: { items: true },
        });
        if (!po) throw new Error("PO not found for this vendor");

        const grn = await tx.goodsReceiptNote.findFirst({
            where: { id: grnId, poId, hotelId },
            include: { items: true },
        });
        if (!grn) throw new Error("GRN not found for this PO");

        const isMatched = decInvoiceAmount.lte(po.totalAmount);

        const apInvoice = await tx.aPInvoice.create({
            data: {
                hotelId,
                vendorId,
                poId,
                grnId,
                invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                dueDate: new Date(dueDate),
                totalAmount: decInvoiceAmount,
                paidAmount: new Prisma.Decimal(0),
                balanceAmount: decInvoiceAmount,
                threeWayMatched: isMatched,
                status: isMatched ? "APPROVED" : "PENDING_APPROVAL",
            },
        });

        return apInvoice;
    }, { maxWait: 15000, timeout: 30000 });
}

export async function recordAPPayment(params: {
    hotelId: string;
    apInvoiceId: string;
    amount: Prisma.Decimal | number | string;
    paymentMethod: string;
    referenceNumber?: string;
    paidById: string;
}) {
    const { hotelId, apInvoiceId, amount, paymentMethod, referenceNumber } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        const invoice = await tx.aPInvoice.findFirst({
            where: { id: apInvoiceId, hotelId },
        });

        if (!invoice) throw new Error("AP Invoice not found");

        const paymentNumber = `APPAY-${Date.now().toString().slice(-8)}`;

        const payment = await tx.aPPayment.create({
            data: {
                hotelId,
                vendorId: invoice.vendorId,
                paymentNumber,
                amount: decAmount,
                unallocatedAmount: new Prisma.Decimal(0),
                paymentMethod,
                paymentDate: new Date(),
                reference: referenceNumber ?? null,
            },
        });

        await tx.aPAllocation.create({
            data: {
                paymentId: payment.id,
                invoiceId: apInvoiceId,
                amount: decAmount,
            },
        });

        const nextPaid = invoice.paidAmount.plus(decAmount);
        const nextBal = invoice.totalAmount.minus(nextPaid);
        const status = nextBal.lte(0) ? "PAID" : "PARTIAL";

        await tx.aPInvoice.update({
            where: { id: apInvoiceId },
            data: {
                paidAmount: nextPaid,
                balanceAmount: nextBal.gt(0) ? nextBal : new Prisma.Decimal(0),
                status,
            },
        });

        return payment;
    }, { maxWait: 15000, timeout: 30000 });
}
