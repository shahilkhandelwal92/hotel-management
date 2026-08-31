/**
 * Enterprise No-Show & Cancellation Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages No-Show detection, automatic fee posting, atomic room block
 * release, inventory reopening, and complete operational audit trails.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface ProcessNoShowParams {
    hotelId: string;
    reservationId: string;
    noShowFee: Prisma.Decimal | number | string;
    processedBy: string;
    billToFolio?: boolean;
}

export async function processNoShow(params: ProcessNoShowParams) {
    const { hotelId, reservationId, noShowFee, processedBy, billToFolio = true } = params;
    const decFee = new Prisma.Decimal(noShowFee.toString());

    return prisma.$transaction(async (tx) => {
        // 1. Check reservation
        const res = await tx.reservation.findFirst({
            where: { id: reservationId, hotelId },
            include: { folios: true },
        });

        if (!res) throw new Error("Reservation not found");
        if (res.status === "CheckedIn" || res.status === "CheckedOut") {
            throw new Error(`Cannot mark reservation with status '${res.status}' as NoShow`);
        }

        // 2. Release all room blocks
        await tx.roomBlock.deleteMany({
            where: { reservationId, hotelId },
        });

        // 3. Mark reservation as NoShow
        const updatedRes = await tx.reservation.update({
            where: { id: reservationId },
            data: { status: "NoShow" },
        });

        // 4. Record NoShow record
        const noShowRecord = await tx.noShowRecord.create({
            data: {
                hotelId,
                reservationId,
                noShowDate: new Date(),
                noShowFee: decFee,
                feeBilled: billToFolio && decFee.gt(0),
                roomReleased: true,
                inventoryReopened: true,
                processedBy,
            },
        });

        // 5. Post fee to master folio if requested
        if (billToFolio && decFee.gt(0) && res.folios.length > 0) {
            const masterFolio = res.folios[0];
            await tx.folioTransaction.create({
                data: {
                    folioId: masterFolio.id,
                    type: "Charge",
                    description: "No-Show Guaranteed Reservation Fee",
                    amount: decFee,
                    postedById: processedBy,
                },
            });

            await tx.folio.update({
                where: { id: masterFolio.id },
                data: { balance: { increment: decFee } },
            });
        }

        return { reservation: updatedRes, noShowRecord };
    }, { maxWait: 15000, timeout: 30000 });
}
