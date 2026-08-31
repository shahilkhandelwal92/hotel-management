/**
 * Enterprise Accounts Receivable (AR) & City Ledger Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages corporate direct billing accounts, credit limits, AR invoicing,
 * payment reconciliation, and automated aging reports (0-30, 31-60, 61-90, 90+ days).
 *
 * Invariant:
 * AR Balance = Invoices - Payments + Adjustments
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateARAccountParams {
    hotelId: string;
    accountCode: string;
    accountName: string;
    accountType?: "CORPORATE" | "TRAVEL_AGENT" | "WHOLESALE" | string;
    creditLimit?: Prisma.Decimal | number | string;
    paymentTermsDays?: number;
    billingAddress?: string;
    taxId?: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
}

export interface PostARInvoiceParams {
    hotelId: string;
    accountId: string;
    invoiceNumber: string;
    invoiceDate: Date | string;
    dueDate: Date | string;
    amount: Prisma.Decimal | number | string;
    sourceFolioId?: string;
    notes?: string;
}

export interface RecordARPaymentParams {
    hotelId: string;
    accountId: string;
    arInvoiceId?: string;
    amount: Prisma.Decimal | number | string;
    paymentMethod: string;
    paymentDate?: Date | string;
    referenceNumber?: string;
    notes?: string;
}

export async function createARAccount(params: CreateARAccountParams) {
    const {
        hotelId,
        accountCode,
        accountName,
        accountType = "CORPORATE",
        creditLimit = 100000,
        paymentTermsDays = 30,
        billingAddress,
        taxId,
        contactPerson,
        contactEmail,
        contactPhone,
    } = params;

    return prisma.aRAccount.create({
        data: {
            hotelId,
            accountCode: accountCode.toUpperCase(),
            accountName,
            accountType,
            creditLimit: new Prisma.Decimal(creditLimit.toString()),
            currentBalance: new Prisma.Decimal(0),
            paymentTermsDays,
            address: billingAddress ?? null,
            gstin: taxId ?? null,
            contactPerson,
            email: contactEmail,
            phone: contactPhone,
            status: "ACTIVE",
        },
    });
}

export async function postARInvoice(params: PostARInvoiceParams) {
    const {
        hotelId,
        accountId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        amount,
        sourceFolioId,
        notes,
    } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        const account = await tx.aRAccount.findFirst({
            where: { id: accountId, hotelId },
        });

        if (!account) throw new Error("AR Account not found");

        const nextBalance = account.currentBalance.plus(decAmount);
        if (nextBalance.gt(account.creditLimit)) {
            throw new Error(
                `Credit limit exceeded for account ${account.accountName} (Limit: ${account.creditLimit}, Current: ${account.currentBalance}, Invoiced: ${decAmount})`
            );
        }

        const invoice = await tx.aRInvoice.create({
            data: {
                hotelId,
                accountId,
                invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                dueDate: new Date(dueDate),
                totalAmount: decAmount,
                paidAmount: new Prisma.Decimal(0),
                balanceAmount: decAmount,
                status: "UNPAID",
                sourceFolioId: sourceFolioId ?? null,
                notes: notes ?? null,
            },
        });

        await tx.aRAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: decAmount } },
        });

        return invoice;
    }, { maxWait: 15000, timeout: 30000 });
}

export async function recordARPayment(params: RecordARPaymentParams) {
    const {
        hotelId,
        accountId,
        arInvoiceId,
        amount,
        paymentMethod,
        paymentDate = new Date(),
        referenceNumber,
        notes,
    } = params;
    const decAmount = new Prisma.Decimal(amount.toString());

    return prisma.$transaction(async (tx) => {
        const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

        const payment = await tx.aRPayment.create({
            data: {
                hotelId,
                accountId,
                paymentNumber,
                amount: decAmount,
                unallocatedAmount: arInvoiceId ? new Prisma.Decimal(0) : decAmount,
                paymentMethod,
                paymentDate: new Date(paymentDate),
                reference: referenceNumber ?? null,
                notes: notes ?? null,
            },
        });

        await tx.aRAccount.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: decAmount } },
        });

        if (arInvoiceId) {
            const invoice = await tx.aRInvoice.findUnique({
                where: { id: arInvoiceId },
            });
            if (invoice) {
                const nextPaid = invoice.paidAmount.plus(decAmount);
                const nextBal = invoice.totalAmount.minus(nextPaid);
                const status = nextBal.lte(0) ? "PAID" : "PARTIAL";

                await tx.aRInvoice.update({
                    where: { id: arInvoiceId },
                    data: {
                        paidAmount: nextPaid,
                        balanceAmount: nextBal.gt(0) ? nextBal : new Prisma.Decimal(0),
                        status,
                    },
                });

                await tx.aRAllocation.create({
                    data: {
                        paymentId: payment.id,
                        invoiceId: arInvoiceId,
                        amount: decAmount,
                    },
                });
            }
        }

        return payment;
    }, { maxWait: 15000, timeout: 30000 });
}

export async function getARAgingReport(hotelId: string, asOfDate: Date = new Date()) {
    const unpaidInvoices = await prisma.aRInvoice.findMany({
        where: {
            hotelId,
            status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
            balanceAmount: { gt: 0 },
        },
        include: { account: true },
    });

    let current0_30 = new Prisma.Decimal(0);
    let bucket31_60 = new Prisma.Decimal(0);
    let bucket61_90 = new Prisma.Decimal(0);
    let bucket90Plus = new Prisma.Decimal(0);
    let totalAR = new Prisma.Decimal(0);

    for (const inv of unpaidInvoices) {
        const diffTime = asOfDate.getTime() - new Date(inv.dueDate).getTime();
        const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        totalAR = totalAR.plus(inv.balanceAmount);

        if (daysOverdue <= 30) {
            current0_30 = current0_30.plus(inv.balanceAmount);
        } else if (daysOverdue <= 60) {
            bucket31_60 = bucket31_60.plus(inv.balanceAmount);
        } else if (daysOverdue <= 90) {
            bucket61_90 = bucket61_90.plus(inv.balanceAmount);
        } else {
            bucket90Plus = bucket90Plus.plus(inv.balanceAmount);
        }
    }

    return {
        asOfDate,
        totalAR,
        current0_30,
        bucket31_60,
        bucket61_90,
        bucket90Plus,
        invoiceCount: unpaidInvoices.length,
    };
}
