/**
 * Engineering & Maintenance Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies asset registration, preventative schedules, and work order lifecycle.
 */

import {
    createMaintenanceAsset,
    createWorkOrder,
    completeWorkOrder,
} from "@/lib/maintenanceEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Engineering & Maintenance Engine", () => {
    let testHotelId: string;
    let testAssetId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const uniqueTag = `CHILLER-${Date.now().toString().slice(-4)}`;
        const asset = await createMaintenanceAsset({
            hotelId: testHotelId,
            name: "Central HVAC Chiller Unit #2",
            assetTag: uniqueTag,
            category: "HVAC",
            location: "Rooftop Plant Room",
            serialNumber: "SN-CARRIER-998822",
        });
        testAssetId = asset.id;
    });

    test("creates a corrective work order and resolves it with technician notes", async () => {
        const wo = await createWorkOrder({
            hotelId: testHotelId,
            assetId: testAssetId,
            title: "Compressor vibration alarm triggered",
            description: "High vibration sensor triggered on chiller unit #2 compressor B",
            priority: "HIGH",
            createdById: "duty-engineer-1",
        });

        expect(wo.status).toBe("REPORTED");
        expect(wo.priority).toBe("HIGH");
        expect(wo.workOrderNumber).toContain("WO-");

        // Complete work order
        const completed = await completeWorkOrder({
            hotelId: testHotelId,
            workOrderId: wo.id,
            resolutionNotes: "Replaced anti-vibration mountings and re-aligned motor shaft",
            completedById: "senior-technician-1",
        });

        expect(completed.status).toBe("COMPLETED");
        expect(completed.completedAt).not.toBeNull();
    });
});
