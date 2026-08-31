import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createVendor,
    createPurchaseOrder,
    receiveGoodsReceiptNote,
    matchThreeWayAPInvoice,
    recordAPPayment,
} from "@/lib/apEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.AP_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const vendors = await prisma.vendorAccount.findMany({
        where: { hotelId: tenant.hotelId },
        include: { purchaseOrders: true, apInvoices: true, apPayments: true },
        orderBy: { vendorName: "asc" },
    });

    return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.AP_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "CREATE_PO") {
            const po = await createPurchaseOrder({
                hotelId: tenant.hotelId,
                vendorId: body.vendorId,
                poNumber: body.poNumber,
                orderDate: body.orderDate,
                expectedDelivery: body.expectedDelivery,
                items: body.items,
                createdById: auth.userId,
                notes: body.notes,
            });
            return NextResponse.json({ po }, { status: 201 });
        }

        if (body.action === "RECEIVE_GRN") {
            const grn = await receiveGoodsReceiptNote({
                hotelId: tenant.hotelId,
                poId: body.poId,
                grnNumber: body.grnNumber,
                deliveryChallanNumber: body.deliveryChallanNumber,
                receivedById: auth.userId,
                items: body.items,
                notes: body.notes,
            });
            return NextResponse.json({ grn }, { status: 201 });
        }

        if (body.action === "MATCH_INVOICE") {
            const invoice = await matchThreeWayAPInvoice({
                hotelId: tenant.hotelId,
                vendorId: body.vendorId,
                poId: body.poId,
                grnId: body.grnId,
                invoiceNumber: body.invoiceNumber,
                invoiceDate: body.invoiceDate,
                dueDate: body.dueDate,
                invoiceAmount: body.invoiceAmount,
            });
            return NextResponse.json({ invoice }, { status: 201 });
        }

        if (body.action === "RECORD_PAYMENT") {
            const payment = await recordAPPayment({
                hotelId: tenant.hotelId,
                apInvoiceId: body.apInvoiceId,
                amount: body.amount,
                paymentMethod: body.paymentMethod,
                referenceNumber: body.referenceNumber,
                paidById: auth.userId,
            });
            return NextResponse.json({ payment }, { status: 201 });
        }

        const vendor = await createVendor({
            hotelId: tenant.hotelId,
            vendorCode: body.vendorCode,
            vendorName: body.vendorName,
            category: body.category,
            taxId: body.taxId,
            contactPerson: body.contactPerson,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            address: body.address,
            paymentTermsDays: body.paymentTermsDays,
        });

        return NextResponse.json({ vendor }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AP operation failed" },
            { status: 500 }
        );
    }
}
