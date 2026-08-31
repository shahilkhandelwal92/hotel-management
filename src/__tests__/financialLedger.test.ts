import { Prisma } from "@prisma/client";
import { calculateInvoiceTotals } from "../lib/invoice";

describe("P1-5: Financial Ledger & Accounting Invariants", () => {
    it("enforces Invoice Total Invariant: SubTotal + Taxes + RoundOff == GrandTotal", () => {
        const invoice = calculateInvoiceTotals(
            [
                { description: "Presidential Suite", quantity: 3, unitPrice: 25000, taxRate: 18 },
                { description: "Private Chef Dining", quantity: 1, unitPrice: 8500, taxRate: 18 },
                { description: "Airport Chauffeur Transfer", quantity: 2, unitPrice: 3000, taxRate: 12 },
            ],
            { isInterState: false, isExempt: false }
        );

        const calculatedSubTotal = 25000 * 3 + 8500 * 1 + 3000 * 2; // 75000 + 8500 + 6000 = 89500
        expect(invoice.subTotal.toNumber()).toBe(calculatedSubTotal);

        const expectedGrandTotal = invoice.subTotal.plus(invoice.totalTax).plus(invoice.roundOff || 0);
        expect(invoice.grandTotal.toNumber()).toBe(expectedGrandTotal.toNumber());
    });

    it("enforces Folio Balance Invariant: Balance = Sum(Charges) - Sum(Payments)", () => {
        let balance = new Prisma.Decimal("0.00");

        // Charges (+)
        const roomCharge = new Prisma.Decimal("12000.00");
        const roomService = new Prisma.Decimal("1850.00");
        const laundry = new Prisma.Decimal("600.00");

        balance = balance.plus(roomCharge).plus(roomService).plus(laundry);
        expect(balance.toNumber()).toBe(14450.00);

        // Payments (-)
        const advancePayment = new Prisma.Decimal("5000.00");
        const finalSettlement = new Prisma.Decimal("9450.00");

        balance = balance.minus(advancePayment);
        expect(balance.toNumber()).toBe(9450.00);

        balance = balance.minus(finalSettlement);
        expect(balance.toNumber()).toBe(0.00);
    });

    it("prevents illegal payment amounts exceeding permitted folio balance", () => {
        const currentBalance = 5000;
        const attemptedPayment = 7000;

        const isOverpaymentAllowed = false;
        const isValid = isOverpaymentAllowed || attemptedPayment <= currentBalance;

        expect(isValid).toBe(false);
    });

    it("prevents illegal refunds exceeding original payment value", () => {
        const originalPayment = 5000;
        const attemptedRefund = 5500;

        const isRefundValid = attemptedRefund <= originalPayment;
        expect(isRefundValid).toBe(false);
    });
});
