/**
 * Enterprise Group & Room Block Management Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages group room allocations, cutoff release automation,
 * group rooming lists, and master group folio billing.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateGroupBlockParams {
    hotelId: string;
    groupName: string;
    companyName?: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    startDate: Date | string;
    endDate: Date | string;
    cutoffDate: Date | string;
    totalRooms: number;
    negotiatedRate: Prisma.Decimal | number | string;
}

export async function createGroupBlock(params: CreateGroupBlockParams) {
    const {
        hotelId,
        groupName,
        companyName,
        contactPerson,
        contactEmail,
        contactPhone,
        startDate,
        endDate,
        cutoffDate,
        totalRooms,
        negotiatedRate,
    } = params;

    return prisma.groupBlock.create({
        data: {
            hotelId,
            groupName,
            companyName: companyName ?? null,
            contactPerson,
            contactEmail,
            contactPhone,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            cutoffDate: new Date(cutoffDate),
            totalRooms,
            pickedUpRooms: 0,
            status: "DEFINITE",
            negotiatedRate: new Prisma.Decimal(negotiatedRate.toString()),
        },
    });
}

export async function addGuestToRoomingList(params: {
    groupBlockId: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    roomNumber?: string;
}) {
    const { groupBlockId, guestName, guestEmail, guestPhone, roomNumber } = params;

    return prisma.$transaction(async (tx) => {
        const block = await tx.groupBlock.findUnique({
            where: { id: groupBlockId },
        });

        if (!block) throw new Error("Group block not found");
        if (block.pickedUpRooms >= block.totalRooms) {
            throw new Error(`Group block room allocation full (${block.pickedUpRooms}/${block.totalRooms})`);
        }

        const entry = await tx.groupRoomingList.create({
            data: {
                groupBlockId,
                guestName,
                guestEmail: guestEmail ?? null,
                guestPhone: guestPhone ?? null,
                roomNumber: roomNumber ?? null,
                status: "RESERVED",
            },
        });

        await tx.groupBlock.update({
            where: { id: groupBlockId },
            data: { pickedUpRooms: { increment: 1 } },
        });

        return entry;
    });
}

export async function releaseUnusedGroupBlocks(hotelId: string, currentDate: Date = new Date()) {
    // Find blocks where cutoffDate < currentDate and pickedUpRooms < totalRooms
    const expiredBlocks = await prisma.groupBlock.findMany({
        where: {
            hotelId,
            status: "DEFINITE",
            cutoffDate: { lt: currentDate },
        },
    });

    const released = [];

    for (const block of expiredBlocks) {
        const updated = await prisma.groupBlock.update({
            where: { id: block.id },
            data: {
                status: "RELEASED",
                totalRooms: block.pickedUpRooms, // Release unpicked rooms back to public inventory
            },
        });
        released.push(updated);
    }

    return released;
}
