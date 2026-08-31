/**
 * Multi-Currency & FX Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies foreign exchange rate storage and multi-currency conversion calculations.
 */

import {
    upsertExchangeRate,
    convertCurrency,
} from "@/lib/currencyEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Multi-Currency & FX Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        // Configure daily FX rates against INR base: USD = 83.50, EUR = 91.20, GBP = 106.80
        await upsertExchangeRate({
            hotelId: testHotelId,
            currencyCode: "USD",
            rateToBase: "83.500000",
        });

        await upsertExchangeRate({
            hotelId: testHotelId,
            currencyCode: "EUR",
            rateToBase: "91.200000",
        });
    });

    test("converts Foreign currency (USD) to Base currency (INR)", async () => {
        // $500 USD at 83.50 = ₹41,750 INR
        const result = await convertCurrency(500, "USD", "INR", testHotelId);

        expect(result.convertedAmount.toNumber()).toBe(41750);
        expect(result.exchangeRate.toNumber()).toBe(83.5);
    });

    test("converts Base currency (INR) to Foreign currency (USD)", async () => {
        // ₹83,500 INR at 83.50 = $1,000 USD
        const result = await convertCurrency(83500, "INR", "USD", testHotelId);

        expect(result.convertedAmount.toNumber()).toBe(1000);
        expect(result.exchangeRate.toNumber()).toBe(83.5);
    });

    test("converts cross currency (EUR to USD) via base currency conversion", async () => {
        // €1,000 EUR in INR = ₹91,200. ₹91,200 / 83.50 = ~$1,092.2155 USD
        const result = await convertCurrency(1000, "EUR", "USD", testHotelId);

        const expected = (1000 * 91.2) / 83.5;
        expect(Math.abs(result.convertedAmount.toNumber() - expected)).toBeLessThan(0.01);
    });
});
