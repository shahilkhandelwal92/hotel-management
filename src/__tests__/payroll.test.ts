// Unit testing the greytHR-style statutory payroll engine

function calculatePT(grossSalary: number): number {
    if (grossSalary <= 7500) return 0;
    if (grossSalary <= 10000) return 175;
    return 200; // Standard Maharashtra / Karnataka slab maximum
}

function calculatePayroll(data: {
    basicSalary: number;
    hra: number;
    conveyance: number;
    medicalAllowance: number;
    otherAllowances: number;
    overtime: number;
    bonus: number;
    incentives: number;
    otherDeductions: number;
    lopDays: number;
    workingDays: number;
}) {
    const lopDeduction = (data.basicSalary / data.workingDays) * data.lopDays;
    const effectiveBasic = Math.max(0, data.basicSalary - lopDeduction);

    const grossSalary =
        effectiveBasic +
        data.hra +
        data.conveyance +
        data.medicalAllowance +
        data.otherAllowances +
        data.overtime +
        data.bonus +
        data.incentives;

    const pf = Math.round(effectiveBasic * 0.12); // 12% employee PF
    const esi = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0; // 0.75% ESI threshold
    const pt = calculatePT(grossSalary);

    const annualGross = grossSalary * 12;
    let tdsAnnual = 0;
    if (annualGross > 1500000) tdsAnnual = (annualGross - 1500000) * 0.30 + 112500;
    else if (annualGross > 1200000) tdsAnnual = (annualGross - 1200000) * 0.20 + 52500;
    else if (annualGross > 1000000) tdsAnnual = (annualGross - 1000000) * 0.15 + 22500;
    else if (annualGross > 700000) tdsAnnual = (annualGross - 700000) * 0.10 + 7500;
    else if (annualGross > 300000) tdsAnnual = (annualGross - 300000) * 0.05;
    const tds = Math.round(tdsAnnual / 12);

    const totalDeductions = pf + esi + pt + tds + (data.otherDeductions || 0);
    const netSalary = Math.round(grossSalary - totalDeductions);

    return { grossSalary: Math.round(grossSalary), pf, esi, pt, tds, totalDeductions, netSalary };
}

describe("Indian Statutory Payroll Engine", () => {
    it("computes standard executive salary with PF, PT, and TDS", () => {
        const result = calculatePayroll({
            basicSalary: 30000,
            hra: 15000,
            conveyance: 2000,
            medicalAllowance: 1500,
            otherAllowances: 1500,
            overtime: 0,
            bonus: 0,
            incentives: 0,
            otherDeductions: 0,
            lopDays: 0,
            workingDays: 26,
        });

        // Gross = 50,000
        expect(result.grossSalary).toBe(50000);
        // PF = 12% of 30,000 = 3600
        expect(result.pf).toBe(3600);
        // ESI is 0 since gross > 21,000
        expect(result.esi).toBe(0);
        // PT = 200 (for gross > 10000)
        expect(result.pt).toBe(200);
        // Annual = 600,000 -> (600,000 - 300,000) * 0.05 = 15,000 / 12 = 1250
        expect(result.tds).toBe(1250);
        expect(result.totalDeductions).toBe(3600 + 0 + 200 + 1250);
        expect(result.netSalary).toBe(50000 - result.totalDeductions);
    });

    it("applies ESI for junior staff earning <= 21,000 gross", () => {
        const result = calculatePayroll({
            basicSalary: 12000,
            hra: 4000,
            conveyance: 1000,
            medicalAllowance: 1000,
            otherAllowances: 0,
            overtime: 0,
            bonus: 0,
            incentives: 0,
            otherDeductions: 0,
            lopDays: 0,
            workingDays: 26,
        });

        // Gross = 18,000
        expect(result.grossSalary).toBe(18000);
        expect(result.pf).toBe(Math.round(12000 * 0.12)); // 1440
        // ESI = 0.75% of 18,000 = 135
        expect(result.esi).toBe(135);
        expect(result.pt).toBe(200);
        expect(result.tds).toBe(0); // Under tax bracket
        expect(result.netSalary).toBe(18000 - (1440 + 135 + 200));
    });

    it("deducts Loss of Pay (LOP) proportionately from basic salary", () => {
        const result = calculatePayroll({
            basicSalary: 26000,
            hra: 10000,
            conveyance: 0,
            medicalAllowance: 0,
            otherAllowances: 0,
            overtime: 0,
            bonus: 0,
            incentives: 0,
            otherDeductions: 0,
            lopDays: 2, // 2 days absent
            workingDays: 26,
        });

        // LOP deduction = 26000/26 * 2 = 2000 -> Effective Basic = 24,000
        // Gross = 24000 + 10000 = 34,000
        expect(result.grossSalary).toBe(34000);
        // PF = 12% of 24,000 = 2880
        expect(result.pf).toBe(2880);
    });

    it("handles zero PT for salaries under minimum threshold (<= 7500)", () => {
        expect(calculatePT(5000)).toBe(0);
        expect(calculatePT(7500)).toBe(0);
        expect(calculatePT(9000)).toBe(175);
        expect(calculatePT(15000)).toBe(200);
    });
});
