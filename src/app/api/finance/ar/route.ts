import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createARAccount,
    postARInvoice,
    recordARPayment,
    getARAgingReport,
} from "@/lib/arEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.AR_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "aging") {
        const aging = await getARAgingReport(tenant.hotelId);
        return NextResponse.json(aging);
    }

    const accounts = await prisma.aRAccount.findMany({
        where: { hotelId: tenant.hotelId },
        include: { invoices: true, payments: true },
        orderBy: { accountName: "asc" },
    });

    return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.AR_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "POST_INVOICE") {
            const invoice = await postARInvoice({
                hotelId: tenant.hotelId,
                accountId: body.accountId,
                invoiceNumber: body.invoiceNumber,
                invoiceDate: body.invoiceDate,
                dueDate: body.dueDate,
                amount: body.amount,
                sourceFolioId: body.sourceFolioId,
                notes: body.notes,
            });
            return NextResponse.json({ invoice }, { status: 201 });
        }

        if (body.action === "RECORD_PAYMENT") {
            const payment = await recordARPayment({
                hotelId: tenant.hotelId,
                accountId: body.accountId,
                arInvoiceId: body.arInvoiceId,
                amount: body.amount,
                paymentMethod: body.paymentMethod,
                paymentDate: body.paymentDate,
                referenceNumber: body.referenceNumber,
                notes: body.notes,
            });
            return NextResponse.json({ payment }, { status: 201 });
        }

        const account = await createARAccount({
            hotelId: tenant.hotelId,
            accountCode: body.accountCode,
            accountName: body.accountName,
            accountType: body.accountType,
            creditLimit: body.creditLimit,
            paymentTermsDays: body.paymentTermsDays,
            billingAddress: body.billingAddress,
            taxId: body.taxId,
            contactPerson: body.contactPerson,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
        });

        return NextResponse.json({ account }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AR operation failed" },
            { status: 500 }
        );
    }
}
