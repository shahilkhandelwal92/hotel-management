/**
 * Accounts Receivable & City Ledger Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies corporate account creation, credit limit enforcement,
 * AR invoicing, payment recording, and aging reports.
 */

import {
    createARAccount,
    postARInvoice,
    recordARPayment,
    getARAgingReport,
} from "@/lib/arEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Accounts Receivable (AR) & City Ledger", () => {
    let testHotelId: string;
    let testAccountId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const uniqueNum = `CORP-${Date.now().toString().slice(-4)}`;
        const account = await createARAccount({
            hotelId: testHotelId,
            accountCode: uniqueNum,
            accountName: "Tata Consultancy Services (TCS)",
            accountType: "CORPORATE",
            creditLimit: 50000,
            paymentTermsDays: 30,
            contactPerson: "Rajesh Gopinath",
            contactEmail: "finance@tcs.com",
            contactPhone: "9876543210",
        });
        testAccountId = account.id;
    });

    test("posts AR invoice, updates account balance, and enforces credit limits", async () => {
        // 1. Post invoice 20,000 (within 50,000 limit)
        const inv1 = await postARInvoice({
            hotelId: testHotelId,
            accountId: testAccountId,
            invoiceNumber: `AR-INV-${Date.now()}-1`,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            amount: 20000,
            notes: "Executive Conference Room & Buffet",
        });

        expect(inv1.status).toBe("UNPAID");
        expect(inv1.totalAmount.toNumber()).toBe(20000);

        const account = await prisma.aRAccount.findUnique({
            where: { id: testAccountId },
        });
        expect(account?.currentBalance.toNumber()).toBe(20000);

        // 2. Attempting to post invoice of 35,000 should exceed 50,000 credit limit (20000 + 35000 = 55000 > 50000)
        await expect(
            postARInvoice({
                hotelId: testHotelId,
                accountId: testAccountId,
                invoiceNumber: `AR-INV-${Date.now()}-2`,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 86400000),
                amount: 35000,
            })
        ).rejects.toThrow(/Credit limit exceeded/);
    });

    test("records corporate bank transfer payment and updates invoice status", async () => {
        const inv = await prisma.aRInvoice.findFirst({
            where: { accountId: testAccountId, status: "UNPAID" },
        });
        if (!inv) throw new Error("Invoice not found");

        const payment = await recordARPayment({
            hotelId: testHotelId,
            accountId: testAccountId,
            arInvoiceId: inv.id,
            amount: 20000,
            paymentMethod: "NEFT/RTGS",
            referenceNumber: "UTR9988776655",
            notes: "Full settlement via RTGS",
        });

        expect(payment.amount.toNumber()).toBe(20000);

        // Verify account balance is back to 0
        const updatedAccount = await prisma.aRAccount.findUnique({
            where: { id: testAccountId },
        });
        expect(updatedAccount?.currentBalance.toNumber()).toBe(0);

        // Verify invoice is marked PAID
        const updatedInvoice = await prisma.aRInvoice.findUnique({
            where: { id: inv.id },
        });
        expect(updatedInvoice?.status).toBe("PAID");
        expect(updatedInvoice?.balanceAmount.toNumber()).toBe(0);
    });

    test("generates AR aging report accurately across buckets", async () => {
        // Create an overdue invoice (dueDate 45 days ago -> 31-60 days bucket)
        const pastDate = new Date(Date.now() - 45 * 86400000);
        await postARInvoice({
            hotelId: testHotelId,
            accountId: testAccountId,
            invoiceNumber: `AR-INV-AGING-${Date.now()}`,
            invoiceDate: new Date(Date.now() - 75 * 86400000),
            dueDate: pastDate,
            amount: 15000,
        });

        const report = await getARAgingReport(testHotelId);
        expect(report.totalAR.toNumber()).toBeGreaterThanOrEqual(15000);
        expect(report.bucket31_60.toNumber()).toBeGreaterThanOrEqual(15000);
    });
});
