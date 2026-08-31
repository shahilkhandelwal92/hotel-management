/**
 * Centralized Domain Pricing Engine
 * ──────────────────────────────────────────────────────────────────────
 * Deterministic calculation for room tariffs, dynamic rate plans,
 * seasonal adjustments, occupancy multipliers, and GST tax computation.
 */

export type RatePlanRuleData = {
    ruleType: string; // Weekend, Weekday, MinStay, MaxStay, EarlyBird, LongStay
    multiplier: number;
    value?: string | null;
};

export type SeasonalRateData = {
    name: string;
    startDate: Date;
    endDate: Date;
    multiplier: number;
    isActive: boolean;
};

export type RatePlanData = {
    baseMultiplier: number;
    rules?: RatePlanRuleData[];
    seasonalRates?: SeasonalRateData[];
};

export type PricingInput = {
    baseRoomPrice: number;
    checkIn: Date | string;
    checkOut: Date | string;
    adults?: number;
    children?: number;
    extraAdultPrice?: number;
    ratePlan?: RatePlanData | null;
    taxRatePct?: number;
    discountPct?: number;
    isTaxIncluded?: boolean;
};

export type NightlyRateBreakdown = {
    date: string;
    basePrice: number;
    multiplier: number;
    finalPrice: number;
};

export type PricingResult = {
    nights: number;
    baseAmount: number;
    extraGuestAmount: number;
    subTotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    totalAmount: number;
    nightlyBreakdown: NightlyRateBreakdown[];
};

export function roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateReservationPrice(input: PricingInput): PricingResult {
    const checkInDate = new Date(input.checkIn);
    const checkOutDate = new Date(input.checkOut);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        throw new Error("Invalid check-in or check-out date");
    }

    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const nightlyBreakdown: NightlyRateBreakdown[] = [];
    let baseAmount = 0;

    const baseMultiplier = input.ratePlan?.baseMultiplier ?? 1.0;
    const rules = input.ratePlan?.rules ?? [];
    const seasonalRates = input.ratePlan?.seasonalRates ?? [];

    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkInDate);
        currentDate.setDate(currentDate.getDate() + i);

        let multiplier = baseMultiplier;
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

        // Weekend rule (Friday or Saturday night)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            const weekendRule = rules.find((r) => r.ruleType.toLowerCase() === "weekend");
            if (weekendRule) {
                multiplier *= weekendRule.multiplier;
            }
        }

        // MinStay / LongStay rule check
        const minStayRule = rules.find((r) => r.ruleType.toLowerCase() === "minstay");
        if (minStayRule && minStayRule.value && nights < parseInt(minStayRule.value, 10)) {
            multiplier *= minStayRule.multiplier;
        }

        // Seasonal rates check
        for (const season of seasonalRates) {
            if (season.isActive && currentDate >= season.startDate && currentDate <= season.endDate) {
                multiplier *= season.multiplier;
                break;
            }
        }

        const dateStr = currentDate.toISOString().slice(0, 10);
        const finalPrice = roundMoney(input.baseRoomPrice * multiplier);

        nightlyBreakdown.push({
            date: dateStr,
            basePrice: input.baseRoomPrice,
            multiplier: roundMoney(multiplier),
            finalPrice,
        });

        baseAmount += finalPrice;
    }

    baseAmount = roundMoney(baseAmount);

    // Extra adult charges (> 2 standard occupancy)
    const extraAdults = Math.max(0, (input.adults ?? 1) - 2);
    const extraAdultRate = input.extraAdultPrice ?? 800;
    const extraGuestAmount = roundMoney(extraAdults * extraAdultRate * nights);

    const subTotal = roundMoney(baseAmount + extraGuestAmount);
    const discountPct = Math.min(100, Math.max(0, input.discountPct ?? 0));
    const discountAmount = roundMoney(subTotal * (discountPct / 100));
    const taxableAmount = roundMoney(subTotal - discountAmount);

    const taxRatePct = Math.min(100, Math.max(0, input.taxRatePct ?? 12));
    let taxAmount = 0;
    let totalAmount = 0;

    if (input.isTaxIncluded) {
        // Reverse calculate tax from total: Total = Taxable * (1 + rate)
        taxAmount = roundMoney(taxableAmount - taxableAmount / (1 + taxRatePct / 100));
        totalAmount = taxableAmount;
    } else {
        taxAmount = roundMoney(taxableAmount * (taxRatePct / 100));
        totalAmount = roundMoney(taxableAmount + taxAmount);
    }

    return {
        nights,
        baseAmount,
        extraGuestAmount,
        subTotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        totalAmount,
        nightlyBreakdown,
    };
}
