/**
 * Enterprise Multi-Currency & FX Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages daily foreign exchange rates against hotel base currency (e.g. INR),
 * and dynamic currency conversion for international guest folios and invoices.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface UpsertExchangeRateParams {
    hotelId: string;
    currencyCode: string;
    rateToBase: Prisma.Decimal | number | string;
    effectiveDate?: Date | string;
}

export async function upsertExchangeRate(params: UpsertExchangeRateParams) {
    const { hotelId, currencyCode, rateToBase, effectiveDate = new Date() } = params;
    const decRate = new Prisma.Decimal(rateToBase.toString());
    const effDate = new Date(effectiveDate);
    // Normalize to date boundary
    effDate.setUTCHours(0, 0, 0, 0);

    return prisma.currencyRate.upsert({
        where: {
            hotelId_currencyCode_effectiveDate: {
                hotelId,
                currencyCode: currencyCode.toUpperCase(),
                effectiveDate: effDate,
            },
        },
        update: {
            rateToBase: decRate,
        },
        create: {
            hotelId,
            currencyCode: currencyCode.toUpperCase(),
            rateToBase: decRate,
            effectiveDate: effDate,
            isDefault: false,
        },
    });
}

export async function convertCurrency(
    amount: Prisma.Decimal | number | string,
    fromCurrency: string,
    toCurrency: string,
    hotelId: string
): Promise<{ convertedAmount: Prisma.Decimal; exchangeRate: Prisma.Decimal }> {
    const decAmount = new Prisma.Decimal(amount.toString());

    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return { convertedAmount: decAmount, exchangeRate: new Prisma.Decimal(1.0) };
    }

    // If converting from Foreign to Base (e.g. USD to INR where rateToBase is 83.50)
    if (toCurrency.toUpperCase() === "INR") {
        const rateRecord = await prisma.currencyRate.findFirst({
            where: {
                hotelId,
                currencyCode: fromCurrency.toUpperCase(),
            },
            orderBy: { effectiveDate: "desc" },
        });

        if (!rateRecord) {
            throw new Error(`Exchange rate for ${fromCurrency} not configured`);
        }

        const converted = decAmount.mul(rateRecord.rateToBase);
        return { convertedAmount: converted, exchangeRate: rateRecord.rateToBase };
    }

    // If converting from Base to Foreign (e.g. INR to USD)
    if (fromCurrency.toUpperCase() === "INR") {
        const rateRecord = await prisma.currencyRate.findFirst({
            where: {
                hotelId,
                currencyCode: toCurrency.toUpperCase(),
            },
            orderBy: { effectiveDate: "desc" },
        });

        if (!rateRecord) {
            throw new Error(`Exchange rate for ${toCurrency} not configured`);
        }

        const converted = decAmount.div(rateRecord.rateToBase);
        return { convertedAmount: converted, exchangeRate: rateRecord.rateToBase };
    }

    // Cross currency conversion
    const fromRate = await prisma.currencyRate.findFirst({
        where: { hotelId, currencyCode: fromCurrency.toUpperCase() },
        orderBy: { effectiveDate: "desc" },
    });
    const toRate = await prisma.currencyRate.findFirst({
        where: { hotelId, currencyCode: toCurrency.toUpperCase() },
        orderBy: { effectiveDate: "desc" },
    });

    if (!fromRate || !toRate) {
        throw new Error(`Exchange rate missing for ${fromCurrency} or ${toCurrency}`);
    }

    const inBase = decAmount.mul(fromRate.rateToBase);
    const converted = inBase.div(toRate.rateToBase);
    const effectiveCross = fromRate.rateToBase.div(toRate.rateToBase);

    return { convertedAmount: converted, exchangeRate: effectiveCross };
}
