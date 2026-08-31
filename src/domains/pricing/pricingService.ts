/**
 * Centralized Domain Pricing Engine (Decimal & Timezone Precision)
 * ──────────────────────────────────────────────────────────────────────
 * Deterministic calculation for room tariffs, dynamic rate plans,
 * seasonal adjustments, occupancy multipliers, and GST tax computation
 * using Prisma.Decimal to eliminate floating point rounding inaccuracies.
 */

import { Prisma } from "@prisma/client";
import { formatHotelBusinessDate, calculateBusinessNights, DEFAULT_HOTEL_TIMEZONE } from "../../lib/timezone";

export type RatePlanRuleData = {
    ruleType: string; // Weekend, Weekday, MinStay, MaxStay, EarlyBird, LongStay
    multiplier: number | Prisma.Decimal;
    value?: string | null;
};

export type SeasonalRateData = {
    name: string;
    startDate: Date;
    endDate: Date;
    multiplier: number | Prisma.Decimal;
    isActive: boolean;
};

export type RatePlanData = {
    baseMultiplier: number | Prisma.Decimal;
    rules?: RatePlanRuleData[];
    seasonalRates?: SeasonalRateData[];
};

export type PricingInput = {
    baseRoomPrice: number | Prisma.Decimal;
    checkIn: Date | string;
    checkOut: Date | string;
    adults?: number;
    children?: number;
    extraAdultPrice?: number | Prisma.Decimal;
    ratePlan?: RatePlanData | null;
    taxRatePct?: number | Prisma.Decimal;
    discountPct?: number | Prisma.Decimal;
    isTaxIncluded?: boolean;
    timezone?: string;
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
    // Direct Prisma.Decimal representations for exact DB insertion
    decimalBaseAmount: Prisma.Decimal;
    decimalExtraGuestAmount: Prisma.Decimal;
    decimalSubTotal: Prisma.Decimal;
    decimalDiscountAmount: Prisma.Decimal;
    decimalTaxableAmount: Prisma.Decimal;
    decimalTaxAmount: Prisma.Decimal;
    decimalTotalAmount: Prisma.Decimal;
};

function toDecimal(val: number | string | Prisma.Decimal | undefined, fallback: number = 0): Prisma.Decimal {
    if (val === undefined || val === null) return new Prisma.Decimal(fallback);
    if (val instanceof Prisma.Decimal) return val;
    return new Prisma.Decimal(val);
}

export function roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateReservationPrice(input: PricingInput): PricingResult {
    const tz = input.timezone || DEFAULT_HOTEL_TIMEZONE;
    const inDateStr = typeof input.checkIn === "string" ? input.checkIn.slice(0, 10) : formatHotelBusinessDate(input.checkIn, tz);
    const outDateStr = typeof input.checkOut === "string" ? input.checkOut.slice(0, 10) : formatHotelBusinessDate(input.checkOut, tz);

    const nights = calculateBusinessNights(inDateStr, outDateStr, tz);
    if (nights <= 0) {
        throw new Error("Check-out date must be strictly after check-in date");
    }

    const baseRoomPrice = toDecimal(input.baseRoomPrice);
    const baseMultiplier = toDecimal(input.ratePlan?.baseMultiplier, 1.0);
    const rules = input.ratePlan?.rules ?? [];
    const seasonalRates = input.ratePlan?.seasonalRates ?? [];

    const nightlyBreakdown: NightlyRateBreakdown[] = [];
    let totalBaseDecimal = new Prisma.Decimal(0);

    const checkInDate = new Date(input.checkIn);

    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkInDate.getTime() + i * 24 * 60 * 60 * 1000);
        let multiplier = baseMultiplier;
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

        // Weekend rule (Friday or Saturday night)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            const weekendRule = rules.find((r) => r.ruleType.toLowerCase() === "weekend");
            if (weekendRule) {
                multiplier = multiplier.times(toDecimal(weekendRule.multiplier));
            }
        }

        // MinStay / LongStay rule check
        const minStayRule = rules.find((r) => r.ruleType.toLowerCase() === "minstay");
        if (minStayRule && minStayRule.value && nights < parseInt(minStayRule.value, 10)) {
            multiplier = multiplier.times(toDecimal(minStayRule.multiplier));
        }

        // Seasonal rates check
        for (const season of seasonalRates) {
            if (season.isActive && currentDate >= season.startDate && currentDate <= season.endDate) {
                multiplier = multiplier.times(toDecimal(season.multiplier));
                break;
            }
        }

        const dateStr = formatHotelBusinessDate(currentDate, tz);
        const finalPrice = baseRoomPrice.times(multiplier).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        nightlyBreakdown.push({
            date: dateStr,
            basePrice: baseRoomPrice.toNumber(),
            multiplier: multiplier.toDecimalPlaces(4).toNumber(),
            finalPrice: finalPrice.toNumber(),
        });

        totalBaseDecimal = totalBaseDecimal.plus(finalPrice);
    }

    // Extra adult charges (> 2 standard occupancy)
    const extraAdults = Math.max(0, (input.adults ?? 1) - 2);
    const extraAdultRate = toDecimal(input.extraAdultPrice, 800);
    const extraGuestDecimal = extraAdultRate.times(extraAdults).times(nights).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const subTotalDecimal = totalBaseDecimal.plus(extraGuestDecimal);

    const discountPct = toDecimal(input.discountPct, 0);
    const discountAmountDecimal = subTotalDecimal.times(discountPct).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const taxableAmountDecimal = subTotalDecimal.minus(discountAmountDecimal);

    const taxRatePct = toDecimal(input.taxRatePct, 12);
    let taxAmountDecimal: Prisma.Decimal;
    let totalAmountDecimal: Prisma.Decimal;

    if (input.isTaxIncluded) {
        // Reverse calculate tax from total: Tax = Taxable - (Taxable / (1 + Rate))
        const divisor = new Prisma.Decimal(1).plus(taxRatePct.dividedBy(100));
        const baseBeforeTax = taxableAmountDecimal.dividedBy(divisor);
        taxAmountDecimal = taxableAmountDecimal.minus(baseBeforeTax).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        totalAmountDecimal = taxableAmountDecimal;
    } else {
        taxAmountDecimal = taxableAmountDecimal.times(taxRatePct).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        totalAmountDecimal = taxableAmountDecimal.plus(taxAmountDecimal);
    }

    return {
        nights,
        baseAmount: totalBaseDecimal.toNumber(),
        extraGuestAmount: extraGuestDecimal.toNumber(),
        subTotal: subTotalDecimal.toNumber(),
        discountAmount: discountAmountDecimal.toNumber(),
        taxableAmount: taxableAmountDecimal.toNumber(),
        taxAmount: taxAmountDecimal.toNumber(),
        totalAmount: totalAmountDecimal.toNumber(),
        nightlyBreakdown,
        decimalBaseAmount: totalBaseDecimal,
        decimalExtraGuestAmount: extraGuestDecimal,
        decimalSubTotal: subTotalDecimal,
        decimalDiscountAmount: discountAmountDecimal,
        decimalTaxableAmount: taxableAmountDecimal,
        decimalTaxAmount: taxAmountDecimal,
        decimalTotalAmount: totalAmountDecimal,
    };
}
