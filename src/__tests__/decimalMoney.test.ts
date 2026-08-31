import { Prisma } from "@prisma/client";
import { calculateInvoiceTotals } from "../lib/invoice";
import { validateMoneyAmount } from "../lib/validation";

describe("P0-1: Decimal Monetary Calculations & Regression Suite", () => {
    it("handles micro-cent and smallest currency units (0.01, 0.10, 0.20, 0.30) without floating point corruption", () => {
        const d1 = new Prisma.Decimal("0.01");
        const d2 = new Prisma.Decimal("0.02");
        const sum = d1.plus(d2);

        expect(sum.toString()).toBe("0.03");
        expect(sum.toNumber()).toBe(0.03);

        const pointOne = new Prisma.Decimal("0.1");
        const pointTwo = new Prisma.Decimal("0.2");
        const pointThree = pointOne.plus(pointTwo);
        expect(pointThree.toString()).toBe("0.3");
        expect(pointThree.toNumber()).toBe(0.3);

        const tenCents = new Prisma.Decimal("0.10");
        const multiplied = tenCents.times(3);
        expect(multiplied.toString()).toBe("0.3");
        expect(multiplied.toFixed(2)).toBe("0.30");
    });

    it("calculates multi-item invoice totals with 999.99 and 99999.99 precision accurately", () => {
        const items = [
            { description: "Room Deluxe Night 1", quantity: 1, unitPrice: 999.99, taxRate: 12 },
            { description: "Room Deluxe Night 2", quantity: 1, unitPrice: 999.99, taxRate: 12 },
            { description: "Mini Bar Soda", quantity: 2, unitPrice: 49.50, taxRate: 5 },
            { description: "Presidential Suite Event", quantity: 1, unitPrice: 99999.99, taxRate: 18 },
        ];

        const totals = calculateInvoiceTotals(items, { isInterState: false, isExempt: false });

        // Base = 999.99 + 999.99 + 99.00 + 99999.99 = 102098.97
        expect(totals.subTotal.toNumber()).toBe(102098.97);
        expect(totals.cgst.plus(totals.sgst).toNumber()).toBe(totals.totalTax.toNumber());
        expect(totals.grandTotal.toNumber()).toBe(Math.round(totals.subTotal.plus(totals.totalTax).toNumber()));
    });

    it("handles fractional quantities and multi-line precision without truncation errors", () => {
        const items = [
            { description: "Paneer (Raw Material)", quantity: 2.5, unitPrice: 350.00, taxRate: 5 },
            { description: "Special Spice Blend", quantity: 0.75, unitPrice: 1200.00, taxRate: 12 },
        ];

        const totals = calculateInvoiceTotals(items, { isInterState: false, isExempt: false });
        // 2.5 * 350 = 875.00, 0.75 * 1200 = 900.00 -> Subtotal = 1775.00
        expect(totals.subTotal.toNumber()).toBe(1775.00);
        // Tax = (875 * 0.05 = 43.75) + (900 * 0.12 = 108.00) = 151.75
        expect(totals.totalTax.toNumber()).toBe(151.75);
        expect(totals.grandTotal.toNumber()).toBe(1927); // 1775 + 151.75 = 1926.75 -> 1927
    });

    it("handles massive multi-million enterprise banquet billing without overflow or precision loss", () => {
        const largeUnitPrice = 2500000.50; // 2.5 Million INR
        const quantity = 3;
        const result = calculateInvoiceTotals(
            [{ description: "Grand Palace Ballroom & Catering", quantity, unitPrice: largeUnitPrice, taxRate: 18 }],
            { isInterState: false, isExempt: false }
        );

        expect(result.subTotal.toNumber()).toBe(7500001.5);
        expect(result.cgst.plus(result.sgst).toNumber()).toBe(result.totalTax.toNumber());
        expect(result.grandTotal.toNumber()).toBeGreaterThan(8850000);
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
