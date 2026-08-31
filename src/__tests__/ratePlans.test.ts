// Unit testing dynamic rate plan calculation engine

type RatePlan = {
    baseMultiplier: number;
    rules: { ruleType: string; multiplier: number; value?: string | null }[];
    seasonalRates: { name: string; startDate: Date; endDate: Date; multiplier: number; isActive: boolean }[];
};

function calculateStayRate(
    baseRoomPrice: number,
    checkInDate: Date,
    nights: number,
    plan: RatePlan
): { totalRate: number; nightlyRates: number[] } {
    const nightlyRates: number[] = [];

    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkInDate);
        currentDate.setDate(currentDate.getDate() + i);

        let multiplier = plan.baseMultiplier;
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat

        // Weekend rule check (Friday=5, Saturday=6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            const weekendRule = plan.rules.find((r) => r.ruleType === "Weekend");
            if (weekendRule) {
                multiplier *= weekendRule.multiplier;
            }
        }

        // MinStay check
        const minStayRule = plan.rules.find((r) => r.ruleType === "MinStay");
        if (minStayRule && minStayRule.value && nights < parseInt(minStayRule.value, 10)) {
            // If condition not met, apply standard penalty or fallback
            multiplier *= minStayRule.multiplier;
        }

        // Seasonal rates check
        for (const season of plan.seasonalRates) {
            if (season.isActive && currentDate >= season.startDate && currentDate <= season.endDate) {
                multiplier *= season.multiplier;
                break;
            }
        }

        const nightlyPrice = Math.round(baseRoomPrice * multiplier);
        nightlyRates.push(nightlyPrice);
    }

    const totalRate = nightlyRates.reduce((sum, rate) => sum + rate, 0);
    return { totalRate, nightlyRates };
}

describe("Dynamic Rate Plan Engine", () => {
    const standardPlan: RatePlan = {
        baseMultiplier: 1.0,
        rules: [
            { ruleType: "Weekend", multiplier: 1.25 },
            { ruleType: "MinStay", multiplier: 1.1, value: "3" },
        ],
        seasonalRates: [
            {
                name: "Peak Diwali Season",
                startDate: new Date("2026-11-01"),
                endDate: new Date("2026-11-10"),
                multiplier: 1.5,
                isActive: true,
            },
        ],
    };

    it("calculates weekday standard rate with base multiplier", () => {
        // Wednesday stay, 2 nights
        const checkIn = new Date("2026-09-02"); // Wednesday
        const result = calculateStayRate(5000, checkIn, 2, { ...standardPlan, rules: [] });

        expect(result.nightlyRates).toEqual([5000, 5000]);
        expect(result.totalRate).toBe(10000);
    });

    it("applies weekend surcharge on Friday and Saturday nights", () => {
        // Thursday to Sunday (3 nights: Thu, Fri, Sat)
        const checkIn = new Date("2026-09-03"); // Thursday
        const result = calculateStayRate(4000, checkIn, 3, {
            baseMultiplier: 1.0,
            rules: [{ ruleType: "Weekend", multiplier: 1.25 }],
            seasonalRates: [],
        });

        // Thu: 4000, Fri: 4000 * 1.25 = 5000, Sat: 4000 * 1.25 = 5000
        expect(result.nightlyRates).toEqual([4000, 5000, 5000]);
        expect(result.totalRate).toBe(14000);
    });

    it("applies seasonal multiplier during festive peak periods", () => {
        const checkIn = new Date("2026-11-02"); // Monday inside Diwali season
        const result = calculateStayRate(6000, checkIn, 2, standardPlan);

        // 6000 * 1.5 (seasonal) * 1.1 (minStay < 3) = 9900 per night
        expect(result.nightlyRates[0]).toBe(9900);
        expect(result.nightlyRates[1]).toBe(9900);
        expect(result.totalRate).toBe(19800);
    });
});
