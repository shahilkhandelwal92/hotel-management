export type InvoiceItemInput = {
    itemType?: string;
    description?: string;
    hsnSac?: string | null;
    quantity: number | string;
    unitPrice: number | string;
    discount?: number | string;
    taxRate?: number | string;
};

export type ProcessedInvoiceItem = {
    itemType: string;
    description: string;
    hsnSac: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
};

export class InvoiceValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvoiceValidationError";
    }
}

export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isValidGstin(value: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(value.trim());
}

export function calculateInvoiceTotals(
    items: InvoiceItemInput[],
    options: { isInterState: boolean; isExempt: boolean },
) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new InvoiceValidationError("At least one invoice item is required");
    }

    const processedItems: ProcessedInvoiceItem[] = items.map((item, index) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const discount = Number(item.discount ?? 0);
        const requestedTaxRate = Number(item.taxRate ?? 0);
        const taxRate = options.isExempt ? 0 : requestedTaxRate;
        const description = item.description?.trim() ?? "";

        if (!description) {
            throw new InvoiceValidationError(`Item ${index + 1}: description is required`);
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new InvoiceValidationError(`Item ${index + 1}: quantity must be greater than zero`);
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new InvoiceValidationError(`Item ${index + 1}: unit price cannot be negative`);
        }
        if (!Number.isFinite(discount) || discount < 0) {
            throw new InvoiceValidationError(`Item ${index + 1}: discount cannot be negative`);
        }
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
            throw new InvoiceValidationError(`Item ${index + 1}: tax rate must be between 0 and 100`);
        }

        const gross = roundMoney(quantity * unitPrice);
        if (discount > gross) {
            throw new InvoiceValidationError(`Item ${index + 1}: discount cannot exceed the line amount`);
        }

        const lineSubtotal = roundMoney(gross - discount);
        const taxAmount = roundMoney(lineSubtotal * (taxRate / 100));
        const cgstAmount = options.isInterState ? 0 : roundMoney(taxAmount / 2);
        const sgstAmount = options.isInterState ? 0 : roundMoney(taxAmount - cgstAmount);
        const igstAmount = options.isInterState ? taxAmount : 0;

        return {
            itemType: item.itemType?.trim() || "Other",
            description,
            hsnSac: item.hsnSac?.trim() || null,
            quantity,
            unitPrice,
            discount,
            taxRate,
            taxAmount,
            lineTotal: roundMoney(lineSubtotal + taxAmount),
            cgstAmount,
            sgstAmount,
            igstAmount,
        };
    });

    const subTotal = roundMoney(processedItems.reduce(
        (total, item) => total + item.lineTotal - item.taxAmount,
        0,
    ));
    const cgst = roundMoney(processedItems.reduce((total, item) => total + item.cgstAmount, 0));
    const sgst = roundMoney(processedItems.reduce((total, item) => total + item.sgstAmount, 0));
    const igst = roundMoney(processedItems.reduce((total, item) => total + item.igstAmount, 0));
    const totalTax = roundMoney(cgst + sgst + igst);
    const unroundedGrandTotal = roundMoney(subTotal + totalTax);
    const grandTotal = Math.round(unroundedGrandTotal);
    const roundOff = roundMoney(grandTotal - unroundedGrandTotal);

    return {
        processedItems,
        subTotal,
        cgst,
        sgst,
        igst,
        totalTax,
        grandTotal,
        roundOff,
    };
}
