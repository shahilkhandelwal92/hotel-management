/**
 * Corporate CRM & Negotiated Contracts Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies corporate pipeline tracking, negotiated contract discounts,
 * fixed room rate overrides, and booking rate calculations.
 */

import {
    createCorporateLead,
    createCorporateContract,
    getApplicableCorporateRate,
} from "@/lib/crmContractEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Corporate CRM & Contracts Engine", () => {
    let testHotelId: string;
    let testLeadId: string;
    let contractNumberFixed: string;
    let contractNumberPercent: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const lead = await createCorporateLead({
            hotelId: testHotelId,
            companyName: "Infosys Technologies Ltd",
            contactName: "Vikram Sarabhai",
            contactEmail: "travel@infosys.com",
            contactPhone: "9876543210",
            estimatedValue: 500000,
            stage: "QUALIFIED",
        });
        testLeadId = lead.id;

        contractNumberFixed = `INFY-FIXED-${Date.now().toString().slice(-4)}`;
        await createCorporateContract({
            hotelId: testHotelId,
            leadId: testLeadId,
            contractNumber: contractNumberFixed,
            companyName: "Infosys Technologies Ltd",
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(Date.now() + 365 * 86400000),
            fixedRoomRate: 4000, // Fixed ₹4,000 / night
        });

        contractNumberPercent = `WIPRO-DISC-${Date.now().toString().slice(-4)}`;
        await createCorporateContract({
            hotelId: testHotelId,
            contractNumber: contractNumberPercent,
            companyName: "Wipro Enterprise",
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(Date.now() + 365 * 86400000),
            negotiatedDiscount: 20, // 20% off BAR
        });
    });

    test("applies fixed negotiated contract rate accurately", async () => {
        const standardRate = 6500;
        const result = await getApplicableCorporateRate(testHotelId, contractNumberFixed, standardRate);

        expect(result.effectiveRate.toNumber()).toBe(4000);
        expect(result.discountApplied.toNumber()).toBe(2500);
    });

    test("applies percentage discount contract rate accurately", async () => {
        const standardRate = 6000;
        const result = await getApplicableCorporateRate(testHotelId, contractNumberPercent, standardRate);

        // 20% of 6000 = 1200; Effective = 4800
        expect(result.effectiveRate.toNumber()).toBe(4800);
        expect(result.discountApplied.toNumber()).toBe(1200);
    });
});
