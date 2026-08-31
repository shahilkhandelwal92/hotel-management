import {
    calculateInvoiceTotals,
    InvoiceValidationError,
    isValidGstin,
} from "../lib/invoice";

describe("invoice calculations", () => {
    it("sums mixed GST rates from each line instead of averaging rates", () => {
        const result = calculateInvoiceTotals([
            { description: "Room", quantity: 1, unitPrice: 1000, taxRate: 12 },
            { description: "Food", quantity: 1, unitPrice: 500, taxRate: 5 },
        ], { isInterState: false, isExempt: false });

        expect(result.subTotal.toNumber()).toBe(1500);
        expect(result.totalTax.toNumber()).toBe(145);
        expect(result.cgst.toNumber()).toBe(72.5);
        expect(result.sgst.toNumber()).toBe(72.5);
        expect(result.igst.toNumber()).toBe(0);
        expect(result.grandTotal.toNumber()).toBe(1645);
    });

    it("uses IGST for inter-state invoices", () => {
        const result = calculateInvoiceTotals([
            { description: "Room", quantity: 2, unitPrice: 1000, taxRate: 12 },
        ], { isInterState: true, isExempt: false });

        expect(result.cgst.toNumber()).toBe(0);
        expect(result.sgst.toNumber()).toBe(0);
        expect(result.igst.toNumber()).toBe(240);
    });

    it("rejects negative line values", () => {
        expect(() => calculateInvoiceTotals([
            { description: "Invalid", quantity: 1, unitPrice: -1, taxRate: 12 },
        ], { isInterState: false, isExempt: false })).toThrow(InvoiceValidationError);
    });

    it("validates GSTIN structure", () => {
        expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
        expect(isValidGstin("INVALID")).toBe(false);
    });
});
