/**
 * Centralized GST Tax & Invoice Calculation Engine
 * ──────────────────────────────────────────────────────────────────────
 * Exact arithmetic using Prisma.Decimal to prevent floating-point inaccuracies
 * across Indian GST tax slabs (0%, 5%, 12%, 18%, 28%), discounts, and intra/inter-state rules.
 */

import { Prisma } from "@prisma/client";

export type InvoiceItemInput = {
    itemType?: string;
    description?: string;
    hsnSac?: string | null;
    quantity: number | string | Prisma.Decimal;
    unitPrice: number | string | Prisma.Decimal;
    discount?: number | string | Prisma.Decimal;
    taxRate?: number | string | Prisma.Decimal;
};

export type ProcessedInvoiceItem = {
    itemType: string;
    description: string;
    hsnSac: string | null;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    taxRate: number;
    taxAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    cgstAmount: Prisma.Decimal;
    sgstAmount: Prisma.Decimal;
    igstAmount: Prisma.Decimal;
};

export interface InvoiceTotalsResult {
    processedItems: ProcessedInvoiceItem[];
    subTotal: Prisma.Decimal;
    cgst: Prisma.Decimal;
    sgst: Prisma.Decimal;
    igst: Prisma.Decimal;
    totalTax: Prisma.Decimal;
    grandTotal: Prisma.Decimal;
    roundOff: Prisma.Decimal;
}

export class InvoiceValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvoiceValidationError";
    }
}

function toDecimal(val: number | string | Prisma.Decimal | undefined, fallback: number = 0): Prisma.Decimal {
    if (val === undefined || val === null || val === "") return new Prisma.Decimal(fallback);
    if (val instanceof Prisma.Decimal) return val;
    return new Prisma.Decimal(val);
}

export function isValidGstin(value: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(value.trim());
}

export function calculateInvoiceTotals(
    items: InvoiceItemInput[],
    options: { isInterState: boolean; isExempt: boolean },
): InvoiceTotalsResult {
    if (!Array.isArray(items) || items.length === 0) {
        throw new InvoiceValidationError("At least one invoice item is required");
    }

    let runningSubtotal = new Prisma.Decimal(0);
    let runningCGST = new Prisma.Decimal(0);
    let runningSGST = new Prisma.Decimal(0);
    let runningIGST = new Prisma.Decimal(0);

    const processedItems: ProcessedInvoiceItem[] = items.map((item, index) => {
        const quantity = Number(item.quantity);
        const unitPrice = toDecimal(item.unitPrice);
        const discount = toDecimal(item.discount, 0);
        const requestedTaxRate = Number(item.taxRate ?? 0);
        const taxRate = options.isExempt ? 0 : requestedTaxRate;
        const description = item.description?.trim() ?? "";

        if (!description) {
            throw new InvoiceValidationError(`Item ${index + 1}: description is required`);
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new InvoiceValidationError(`Item ${index + 1}: quantity must be greater than zero`);
        }
        if (unitPrice.isNegative()) {
            throw new InvoiceValidationError(`Item ${index + 1}: unit price cannot be negative`);
        }
        if (discount.isNegative()) {
            throw new InvoiceValidationError(`Item ${index + 1}: discount cannot be negative`);
        }
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
            throw new InvoiceValidationError(`Item ${index + 1}: tax rate must be between 0 and 100`);
        }

        const quantityDec = new Prisma.Decimal(quantity);
        const gross = quantityDec.times(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        if (discount.greaterThan(gross)) {
            throw new InvoiceValidationError(`Item ${index + 1}: discount cannot exceed the line amount`);
        }

        const lineSubtotal = gross.minus(discount);
        const taxRateDec = new Prisma.Decimal(taxRate);
        const taxAmount = lineSubtotal.times(taxRateDec).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        let cgstAmount = new Prisma.Decimal(0);
        let sgstAmount = new Prisma.Decimal(0);
        let igstAmount = new Prisma.Decimal(0);

        if (options.isInterState) {
            igstAmount = taxAmount;
        } else {
            cgstAmount = taxAmount.dividedBy(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            sgstAmount = taxAmount.minus(cgstAmount); // Exact sum preservation
        }

        const lineTotal = lineSubtotal.plus(taxAmount);

        runningSubtotal = runningSubtotal.plus(lineSubtotal);
        runningCGST = runningCGST.plus(cgstAmount);
        runningSGST = runningSGST.plus(sgstAmount);
        runningIGST = runningIGST.plus(igstAmount);

        return {
            itemType: item.itemType?.trim() || "Other",
            description,
            hsnSac: item.hsnSac?.trim() || null,
            quantity,
            unitPrice,
            discount,
            taxRate,
            taxAmount,
            lineTotal,
            cgstAmount,
            sgstAmount,
            igstAmount,
        };
    });

    const totalTax = runningCGST.plus(runningSGST).plus(runningIGST);
    const unroundedGrandTotal = runningSubtotal.plus(totalTax);
    // Standard Indian GST rounding to nearest integer
    const grandTotalRounded = new Prisma.Decimal(Math.round(unroundedGrandTotal.toNumber()));
    const roundOff = grandTotalRounded.minus(unroundedGrandTotal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
        processedItems,
        subTotal: runningSubtotal,
        cgst: runningCGST,
        sgst: runningSGST,
        igst: runningIGST,
        totalTax,
        grandTotal: grandTotalRounded,
        roundOff,
    };
}
