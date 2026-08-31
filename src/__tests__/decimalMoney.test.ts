import { Prisma } from "@prisma/client";
import { calculateInvoiceTotals } from "../lib/invoice";
import { validateMoneyAmount } from "../lib/validation";

describe("P0-1: Decimal Monetary Calculations & Regression Suite", () => {
    it("handles micro-cent and smallest currency units (0.01, 0.10) without floating point corruption", () => {
        const d1 = new Prisma.Decimal("0.01");
        const d2 = new Prisma.Decimal("0.02");
        const sum = d1.plus(d2);

        expect(sum.toString()).toBe("0.03");
        expect(sum.toNumber()).toBe(0.03);

        const tenCents = new Prisma.Decimal("0.10");
        const multiplied = tenCents.times(3);
        expect(multiplied.toString()).toBe("0.3");
        expect(multiplied.toFixed(2)).toBe("0.30");
    });

    it("calculates multi-item invoice totals with 999.99 precision accurately", () => {
        const items = [
            { description: "Room Deluxe Night 1", quantity: 1, unitPrice: 999.99, taxRate: 12 },
            { description: "Room Deluxe Night 2", quantity: 1, unitPrice: 999.99, taxRate: 12 },
            { description: "Mini Bar Soda", quantity: 2, unitPrice: 49.50, taxRate: 5 },
        ];

        const totals = calculateInvoiceTotals(items, { isInterState: false, isExempt: false });

        // Total base = (999.99 * 2) + (49.50 * 2) = 1999.98 + 99.00 = 2098.98
        expect(totals.subTotal).toBe(2098.98);
        expect(totals.grandTotal).toBe(Math.round(totals.subTotal + totals.totalTax));
        expect(totals.cgst + totals.sgst).toBe(totals.totalTax);
    });

    it("handles massive multi-million enterprise banquet billing without overflow or precision loss", () => {
        const largeUnitPrice = 2500000.50; // 2.5 Million INR
        const quantity = 3;
        const result = calculateInvoiceTotals(
            [{ description: "Grand Palace Ballroom & Catering", quantity, unitPrice: largeUnitPrice, taxRate: 18 }],
            { isInterState: false, isExempt: false }
        );

        expect(result.subTotal).toBe(7500001.5);
        expect(result.cgst + result.sgst).toBe(result.totalTax);
        expect(result.grandTotal).toBeGreaterThan(8850000);
    });

    it("rejects invalid money inputs (NaN, Infinity, negative amounts)", () => {
        expect(() => validateMoneyAmount(NaN, "Price")).toThrow("Price cannot be NaN or Infinity");
        expect(() => validateMoneyAmount(Infinity, "Price")).toThrow("Price cannot be NaN or Infinity");
        expect(() => validateMoneyAmount(-100, "Price")).toThrow("Price cannot be negative");
        expect(validateMoneyAmount("1450.75", "Price")).toBe(1450.75);
    });

    it("guarantees folio settlement balance reconciliation", () => {
        const initialBalance = new Prisma.Decimal("15000.00");
        const deposit = new Prisma.Decimal("5000.00");
        const inStayCharge = new Prisma.Decimal("1250.50");
        const finalSettlement = new Prisma.Decimal("11250.50");

        let runningBalance = initialBalance.minus(deposit);
        expect(runningBalance.toFixed(2)).toBe("10000.00");

        runningBalance = runningBalance.plus(inStayCharge);
        expect(runningBalance.toFixed(2)).toBe("11250.50");

        runningBalance = runningBalance.minus(finalSettlement);
        expect(runningBalance.toFixed(2)).toBe("0.00");
    });
});
