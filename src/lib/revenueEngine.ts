/**
 * Enterprise Dynamic Revenue Management & Restriction Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages MinLOS, MaxLOS, Closed-to-Arrival (CTA), Closed-to-Departure (CTD),
 * and Stop-Sell rate restrictions with strict booking validation.
 */

import prisma from "@/lib/prisma";

export interface SetRateRestrictionParams {
    hotelId: string;
    roomCategoryId?: string;
    ratePlanId?: string;
    date: Date | string;
    minLOS?: number;
    maxLOS?: number;
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
    stopSell?: boolean;
}

export async function setRateRestriction(params: SetRateRestrictionParams) {
    const {
        hotelId,
        roomCategoryId,
        ratePlanId,
        date,
        minLOS = 1,
        maxLOS,
        closedToArrival = false,
        closedToDeparture = false,
        stopSell = false,
    } = params;

    const targetDate = new Date(date);

    return prisma.rateRestriction.upsert({
        where: {
            hotelId_roomCategoryId_ratePlanId_date: {
                hotelId,
                roomCategoryId: roomCategoryId ?? "",
                ratePlanId: ratePlanId ?? "",
                date: targetDate,
            },
        },
        update: {
            minLOS,
            maxLOS: maxLOS ?? null,
            closedToArrival,
            closedToDeparture,
            stopSell,
        },
        create: {
            hotelId,
            roomCategoryId: roomCategoryId ?? "",
            ratePlanId: ratePlanId ?? "",
            date: targetDate,
            minLOS,
            maxLOS: maxLOS ?? null,
            closedToArrival,
            closedToDeparture,
            stopSell,
        },
    });
}

export async function validateBookingRestrictions(params: {
    hotelId: string;
    roomCategoryId?: string;
    ratePlanId?: string;
    checkIn: Date | string;
    checkOut: Date | string;
}): Promise<{ allowed: boolean; reason?: string }> {
    const { hotelId, roomCategoryId, ratePlanId, checkIn, checkOut } = params;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffNights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Fetch restrictions across stay dates
    const restrictions = await prisma.rateRestriction.findMany({
        where: {
            hotelId,
            date: {
                gte: checkInDate,
                lte: checkOutDate,
            },
            OR: [
                { roomCategoryId: roomCategoryId ?? "" },
                { roomCategoryId: "" },
            ],
        },
    });

    for (const res of restrictions) {
        const resDateStr = res.date.toISOString().slice(0, 10);
        const checkInStr = checkInDate.toISOString().slice(0, 10);
        const checkOutStr = checkOutDate.toISOString().slice(0, 10);

        // 1. Stop Sell
        if (res.stopSell) {
            return { allowed: false, reason: `Stop Sell restriction active on ${resDateStr}` };
        }

        // 2. Closed to Arrival (CTA) on check-in date
        if (resDateStr === checkInStr && res.closedToArrival) {
            return { allowed: false, reason: `Arrival closed (CTA) on ${checkInStr}` };
        }

        // 3. Closed to Departure (CTD) on check-out date
        if (resDateStr === checkOutStr && res.closedToDeparture) {
            return { allowed: false, reason: `Departure closed (CTD) on ${checkOutStr}` };
        }

        // 4. Min Length of Stay
        if (resDateStr === checkInStr && res.minLOS && diffNights < res.minLOS) {
            return {
                allowed: false,
                reason: `Minimum length of stay is ${res.minLOS} nights for arrival on ${checkInStr}`,
            };
        }

        // 5. Max Length of Stay
        if (resDateStr === checkInStr && res.maxLOS && diffNights > res.maxLOS) {
            return {
                allowed: false,
                reason: `Maximum length of stay is ${res.maxLOS} nights for arrival on ${checkInStr}`,
            };
        }
    }

    return { allowed: true };
}
