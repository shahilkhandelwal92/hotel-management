/**
 * Enterprise Linen & Minibar Management Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages linen stock tracking across clean, dirty, laundry, and damaged cycles,
 * and automated room minibar replenishment & guest folio charge posting.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RecordLinenCycleParams {
    hotelId: string;
    name: string;
    code: string;
    parStock?: number;
    totalStock: number;
    inRooms?: number;
    inLinenRoom?: number;
    inLaundry?: number;
    damaged?: number;
}

export interface RecordMinibarConsumptionParams {
    hotelId: string;
    roomId: string;
    reservationId: string;
    minibarItemId: string;
    quantity: number;
    unitPrice: Prisma.Decimal | number | string;
    billToFolio?: boolean;
    inspectedById: string;
}

export async function upsertLinenStock(params: RecordLinenCycleParams) {
    const {
        hotelId,
        name,
        code,
        parStock = 100,
        totalStock,
        inRooms = 0,
        inLinenRoom = 0,
        inLaundry = 0,
        damaged = 0,
    } = params;

    return prisma.linenItem.upsert({
        where: {
            hotelId_code: { hotelId, code: code.toUpperCase() },
        },
        update: {
            name,
            parStock,
            totalStock,
            inRooms,
            inLinenRoom,
            inLaundry,
            damaged,
        },
        create: {
            hotelId,
            name,
            code: code.toUpperCase(),
            parStock,
            totalStock,
            inRooms,
            inLinenRoom,
            inLaundry,
            damaged,
        },
    });
}

export async function createMinibarItem(params: {
    hotelId: string;
    name: string;
    code: string;
    price: Prisma.Decimal | number | string;
    costPrice?: Prisma.Decimal | number | string;
    stockQty?: number;
}) {
    const { hotelId, name, code, price, costPrice = 0, stockQty = 50 } = params;

    return prisma.minibarItem.create({
        data: {
            hotelId,
            name,
            code: code.toUpperCase(),
            price: new Prisma.Decimal(price.toString()),
            costPrice: new Prisma.Decimal(costPrice.toString()),
            stockQty,
        },
    });
}

export async function recordMinibarConsumption(params: RecordMinibarConsumptionParams) {
    const { hotelId, roomId, reservationId, minibarItemId, quantity, unitPrice, billToFolio = true, inspectedById } = params;
    const decUnitPrice = new Prisma.Decimal(unitPrice.toString());
    const totalAmount = decUnitPrice.mul(quantity);

    return prisma.$transaction(async (tx) => {
        const item = await tx.minibarItem.findUnique({
            where: { id: minibarItemId },
        });

        const itemName = item?.name ?? "Minibar Item";

        const consumption = await tx.minibarConsumption.create({
            data: {
                hotelId,
                roomId,
                reservationId,
                minibarItemId,
                quantity,
                unitPrice: decUnitPrice,
                totalAmount,
                postedToFolio: billToFolio,
                recordedBy: inspectedById,
            },
        });

        // Post charge to active folio if requested and reservation exists
        if (billToFolio) {
            const folio = await tx.folio.findFirst({
                where: { reservationId, hotelId },
            });

            if (folio) {
                await tx.folioTransaction.create({
                    data: {
                        folioId: folio.id,
                        type: "Charge",
                        description: `Minibar: ${quantity}x ${itemName}`,
                        amount: totalAmount,
                        postedById: inspectedById,
                    },
                });

                await tx.folio.update({
                    where: { id: folio.id },
                    data: { balance: { increment: totalAmount } },
                });
            }
        }

        return consumption;
    }, { maxWait: 15000, timeout: 30000 });
}
