import { calculateReservationPrice } from "../domains/pricing/pricingService";

describe("Domain Pricing Service", () => {
    it("calculates standard 2-night stay with 12% GST correctly", () => {
        const result = calculateReservationPrice({
            baseRoomPrice: 5000,
            checkIn: "2026-09-01",
            checkOut: "2026-09-03",
            adults: 2,
            taxRatePct: 12,
        });

        expect(result.nights).toBe(2);
        expect(result.baseAmount).toBe(10000);
        expect(result.extraGuestAmount).toBe(0);
        expect(result.taxableAmount).toBe(10000);
        expect(result.taxAmount).toBe(1200);
        expect(result.totalAmount).toBe(11200);
    });

    it("applies extra adult fee correctly across all nights", () => {
        const result = calculateReservationPrice({
            baseRoomPrice: 4000,
            checkIn: "2026-09-01",
            checkOut: "2026-09-04", // 3 nights
            adults: 3, // 1 extra adult
            extraAdultPrice: 1000,
            taxRatePct: 18,
        });

        expect(result.nights).toBe(3);
        expect(result.baseAmount).toBe(12000);
        expect(result.extraGuestAmount).toBe(3000); // 1 extra * 1000 * 3 nights
        expect(result.subTotal).toBe(15000);
        expect(result.taxableAmount).toBe(15000);
        expect(result.taxAmount).toBe(2700); // 18% of 15000
        expect(result.totalAmount).toBe(17700);
    });

    it("applies percentage discount before tax computation", () => {
        const result = calculateReservationPrice({
            baseRoomPrice: 10000,
            checkIn: "2026-09-01",
            checkOut: "2026-09-02", // 1 night
            discountPct: 10, // 10% discount
            taxRatePct: 12,
        });

        expect(result.baseAmount).toBe(10000);
        expect(result.discountAmount).toBe(1000);
        expect(result.taxableAmount).toBe(9000);
        expect(result.taxAmount).toBe(1080);
        expect(result.totalAmount).toBe(10080);
    });

    it("handles tax-included pricing seamlessly", () => {
        const result = calculateReservationPrice({
            baseRoomPrice: 5600,
            checkIn: "2026-09-01",
            checkOut: "2026-09-02",
            isTaxIncluded: true,
            taxRatePct: 12,
        });

        expect(result.totalAmount).toBe(5600);
        // Tax is embedded: 5600 - (5600 / 1.12) = 600
        expect(result.taxAmount).toBe(600);
    });

    it("applies dynamic rate plan rules (weekend surcharge)", () => {
        // Friday to Sunday = 2 nights (both weekend nights)
        const result = calculateReservationPrice({
            baseRoomPrice: 4000,
            checkIn: "2026-09-04", // Friday
            checkOut: "2026-09-06", // Sunday
            ratePlan: {
                baseMultiplier: 1.0,
                rules: [{ ruleType: "Weekend", multiplier: 1.25 }],
            },
            taxRatePct: 12,
        });

        // 4000 * 1.25 = 5000 per night * 2 nights = 10000
        expect(result.baseAmount).toBe(10000);
        expect(result.taxAmount).toBe(1200);
        expect(result.totalAmount).toBe(11200);
    });
});
