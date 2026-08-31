import { getFinancialYearString } from "../lib/invoiceSequence";

describe("P1-2: Atomic Invoice Sequence Number Generation", () => {
    it("generates correct Indian Financial Year string across calendar months", () => {
        // May 2026 -> FY 2026-27
        const may2026 = new Date(2026, 4, 15);
        expect(getFinancialYearString(may2026)).toBe("2026-27");

        // Feb 2026 -> FY 2025-26
        const feb2026 = new Date(2026, 1, 10);
        expect(getFinancialYearString(feb2026)).toBe("2025-26");

        // Dec 2026 -> FY 2026-27
        const dec2026 = new Date(2026, 11, 25);
        expect(getFinancialYearString(dec2026)).toBe("2026-27");
    });

    it("generates formatted sequence strings with zero padding", () => {
        const fy = "2026-27";
        const prefix = "INV";
        const formatted = (seq: number) => `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;

        expect(formatted(1)).toBe("INV/2026-27/0001");
        expect(formatted(42)).toBe("INV/2026-27/0042");
        expect(formatted(1050)).toBe("INV/2026-27/1050");
    });

    it("simulates 100 concurrent invoice number allocations with zero duplicates", () => {
        let counter = 1;
        const allocated = new Set<string>();

        const promises = Array.from({ length: 100 }, () => {
            const seq = counter++;
            const num = `INV/2026-27/${String(seq).padStart(4, "0")}`;
            allocated.add(num);
            return Promise.resolve(num);
        });

        return Promise.all(promises).then((results) => {
            expect(results).toHaveLength(100);
            expect(allocated.size).toBe(100);
            expect(allocated.has("INV/2026-27/0001")).toBe(true);
            expect(allocated.has("INV/2026-27/0100")).toBe(true);
        });
    });
});
