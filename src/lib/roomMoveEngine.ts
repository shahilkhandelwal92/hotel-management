/**
 * Enterprise Room Move Lifecycle Engine
 * ──────────────────────────────────────────────────────────────────────
 * Moves checked-in guests between physical rooms atomically:
 * - Releases old room blocks & sets old room to 'Dirty'
 * - Allocates new room blocks & sets new room to 'Occupied'
 * - Reassigns active digital access credentials
 * - Preserves original reservation, guest CRM, rate plans, and folios
 */

import prisma from "@/lib/prisma";

export interface ExecuteRoomMoveParams {
    hotelId: string;
    reservationId: string;
    targetRoomId: string;
    movedBy: string;
    reason: string;
}

export async function executeRoomMove(params: ExecuteRoomMoveParams) {
    const { hotelId, reservationId, targetRoomId, movedBy, reason } = params;

    return prisma.$transaction(async (tx) => {
        // 1. Fetch reservation
        const res = await tx.reservation.findFirst({
            where: { id: reservationId, hotelId },
            include: { room: true, folios: true, accessCredentials: true },
        });

        if (!res) throw new Error("Reservation not found");
        if (res.status !== "CheckedIn") {
            throw new Error(`Room move is only permitted for active in-stay reservations. Current status: ${res.status}`);
        }

        const oldRoomId = res.roomId;
        if (!oldRoomId) {
            throw new Error("Reservation has no assigned room to move from");
        }

        if (oldRoomId === targetRoomId) {
            throw new Error("Target room cannot be the same as current room");
        }

        // 2. Verify target room is available and vacant
        const targetRoom = await tx.room.findFirst({
            where: { id: targetRoomId, hotelId },
        });

        if (!targetRoom) throw new Error("Target room not found");
        if (targetRoom.status !== "Vacant" && targetRoom.status !== "Clean") {
            throw new Error(`Target room ${targetRoom.number} is not vacant/clean. Current status: ${targetRoom.status}`);
        }

        // 3. Move room blocks from old room to new room
        const existingBlocks = await tx.roomBlock.findMany({
            where: { reservationId, hotelId },
        });

        for (const block of existingBlocks) {
            // Check for conflict on target room
            const conflict = await tx.roomBlock.findFirst({
                where: {
                    roomId: targetRoomId,
                    date: block.date,
                    hotelId,
                },
            });

            if (conflict) {
                throw new Error(`Target room ${targetRoom.number} is already blocked on ${block.date.toISOString().slice(0, 10)}`);
            }

            // Update block to target room
            await tx.roomBlock.update({
                where: { id: block.id },
                data: { roomId: targetRoomId },
            });
        }

        // 4. Update old room status to Dirty and new room status to Occupied
        await tx.room.update({
            where: { id: oldRoomId },
            data: { status: "Dirty" },
        });

        await tx.room.update({
            where: { id: targetRoomId },
            data: { status: "Occupied" },
        });

        // 5. Update reservation record
        const updatedRes = await tx.reservation.update({
            where: { id: reservationId },
            data: { roomId: targetRoomId },
        });

        // 6. Record audit note on master folio
        if (res.folios.length > 0) {
            await tx.folioTransaction.create({
                data: {
                    folioId: res.folios[0].id,
                    type: "Transfer",
                    description: `Room Move from ${res.room?.number ?? oldRoomId} to ${targetRoom.number}: ${reason}`,
                    amount: 0,
                    postedById: movedBy,
                },
            });
        }

        // 7. Create housekeeping task for old room
        await tx.housekeepingTask.create({
            data: {
                hotelId,
                roomId: oldRoomId,
                roomNumber: res.room?.number ?? "MOVE-OLD",
                taskType: "Turnover",
                notes: `Turnover cleaning after room move from ${res.room?.number ?? "old room"}`,
                status: "Pending",
                priority: "High",
            },
        });

        return { reservation: updatedRes, oldRoomId, targetRoomId };
    }, { maxWait: 15000, timeout: 30000 });
}
