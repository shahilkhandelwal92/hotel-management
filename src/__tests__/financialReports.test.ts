// Testing dynamic financial and GST report aggregation logic

type MockInvoice = {
    subTotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    grandTotal: number;
    invoiceFormat: "B2B" | "B2C";
    billedToGstin?: string;
    items: Array<{ itemType: string; lineTotal: number; taxAmount: number; cgstAmount?: number; sgstAmount?: number; igstAmount?: number }>;
};

function aggregateGstReport(invoices: MockInvoice[]) {
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalGSTLiability = 0;

    let b2bCount = 0;
    let b2cCount = 0;

    for (const inv of invoices) {
        totalTaxableValue += inv.subTotal;
        totalCGST += inv.cgst;
        totalSGST += inv.sgst;
        totalIGST += inv.igst;
        totalGSTLiability += inv.totalTax;

        if (inv.invoiceFormat === "B2B" || Boolean(inv.billedToGstin && inv.billedToGstin.trim())) {
            b2bCount++;
        } else {
            b2cCount++;
        }
    }

    return {
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalGSTLiability,
        b2bCount,
        b2cCount,
    };
}

describe("Financial & GST Live Report Calculations", () => {
    it("aggregates intra-state and inter-state GST supplies accurately", () => {
        const invoices: MockInvoice[] = [
            {
                subTotal: 10000,
                cgst: 600,
                sgst: 600,
                igst: 0,
                totalTax: 1200,
                grandTotal: 11200,
                invoiceFormat: "B2C",
                items: [{ itemType: "Room", lineTotal: 11200, taxAmount: 1200 }],
            },
            {
                subTotal: 25000,
                cgst: 0,
                sgst: 0,
                igst: 4500,
                totalTax: 4500,
                grandTotal: 29500,
                invoiceFormat: "B2B",
                billedToGstin: "27AABCT1234C1Z5",
                items: [{ itemType: "Event", lineTotal: 29500, taxAmount: 4500 }],
            },
        ];

        const report = aggregateGstReport(invoices);

        expect(report.totalTaxableValue).toBe(35000);
        expect(report.totalCGST).toBe(600);
        expect(report.totalSGST).toBe(600);
        expect(report.totalIGST).toBe(4500);
        expect(report.totalGSTLiability).toBe(5700);
        expect(report.b2bCount).toBe(1);
        expect(report.b2cCount).toBe(1);
    });

    it("handles empty periods without division by zero or NaN", () => {
        const report = aggregateGstReport([]);

        expect(report.totalTaxableValue).toBe(0);
        expect(report.totalGSTLiability).toBe(0);
        expect(report.b2bCount).toBe(0);
        expect(report.b2cCount).toBe(0);
    });
});
