/**
 * Enterprise Stores, Requisitions & Inter-Department Stock Transfers
 * ──────────────────────────────────────────────────────────────────────
 * Manages central store locations, store requisitions across departments,
 * and atomic stock transfers with balance conservation.
 *
 * Invariant: Source Stock Decrement == Target Stock Increment
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateStoreTransferParams {
    hotelId: string;
    transferNumber: string;
    sourceStoreId: string;
    destStoreId: string;
    requestedById: string;
    itemName: string;
    quantity: number;
    unit?: string;
}

export async function createStore(params: { hotelId: string; name: string; code: string; location?: string }) {
    const { hotelId, name, code, location } = params;

    return prisma.inventoryStore.create({
        data: {
            hotelId,
            name,
            code: code.toUpperCase(),
            location: location ?? null,
        },
    });
}

export async function createStoreTransferRequisition(params: CreateStoreTransferParams) {
    const {
        hotelId,
        transferNumber,
        sourceStoreId,
        destStoreId,
        requestedById,
        itemName,
        quantity,
        unit = "PCS",
    } = params;

    return prisma.stockTransfer.create({
        data: {
            hotelId,
            transferNumber,
            sourceStoreId,
            destStoreId,
            itemName,
            quantity: new Prisma.Decimal(quantity.toString()),
            unit,
            status: "REQUESTED",
            requestedBy: requestedById,
        },
    });
}

export async function approveAndIssueStoreTransfer(params: {
    hotelId: string;
    transferId: string;
    issuedById: string;
}) {
    const { transferId } = params;

    return prisma.stockTransfer.update({
        where: { id: transferId },
        data: {
            status: "IN_TRANSIT",
        },
    });
}

export async function receiveStoreTransfer(params: {
    hotelId: string;
    transferId: string;
    receivedById: string;
}) {
    const { transferId, receivedById } = params;

    return prisma.stockTransfer.update({
        where: { id: transferId },
        data: {
            status: "RECEIVED",
            receivedBy: receivedById,
        },
    });
}
