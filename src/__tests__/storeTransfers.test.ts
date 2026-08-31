/**
 * Stores & Inter-Department Stock Transfers Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies store requisition creation, issue, and receipt workflows.
 */

import {
    createStore,
    createStoreTransferRequisition,
    approveAndIssueStoreTransfer,
    receiveStoreTransfer,
} from "@/lib/storesEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Stores & Inventory Transfer Engine", () => {
    let testHotelId: string;
    let mainStoreId: string;
    let hkStoreId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const mainStore = await createStore({
            hotelId: testHotelId,
            name: "Central Main Store",
            code: `MAIN-${Date.now().toString().slice(-4)}`,
        });
        mainStoreId = mainStore.id;

        const hkStore = await createStore({
            hotelId: testHotelId,
            name: "Housekeeping Floor Pantry Store",
            code: `HK-${Date.now().toString().slice(-4)}`,
        });
        hkStoreId = hkStore.id;
    });

    test("executes complete store requisition lifecycle: REQUESTED -> IN_TRANSIT -> RECEIVED", async () => {
        const transfer = await createStoreTransferRequisition({
            hotelId: testHotelId,
            transferNumber: `STR-${Date.now()}`,
            sourceStoreId: mainStoreId,
            destStoreId: hkStoreId,
            requestedById: "hk-supervisor-1",
            itemName: "Toilet Paper Rolls (2-ply)",
            quantity: 200,
            unit: "ROLLS",
        });

        expect(transfer.status).toBe("REQUESTED");
        expect(transfer.quantity.toNumber()).toBe(200);

        // Store manager issues transfer
        const issued = await approveAndIssueStoreTransfer({
            hotelId: testHotelId,
            transferId: transfer.id,
            issuedById: "store-manager-1",
        });

        expect(issued.status).toBe("IN_TRANSIT");

        // Housekeeping receives transfer
        const received = await receiveStoreTransfer({
            hotelId: testHotelId,
            transferId: transfer.id,
            receivedById: "hk-supervisor-1",
        });

        expect(received.status).toBe("RECEIVED");
        expect(received.receivedBy).toBe("hk-supervisor-1");
    });
});
