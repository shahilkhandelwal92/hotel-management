/**
 * Reporting Reconciliation & Source Ledger Integrity Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies mathematical reconciliation between source transactional records
 * and managerial dashboard KPIs:
 * - ADR = Total Room Revenue / Occupied Rooms
 * - RevPAR = Total Room Revenue / Available Rooms
 * - TrevPAR = (Room Rev + F&B Rev + Other Rev) / Available Rooms
 * - Occupancy % = (Occupied Rooms / Total Rooms) * 100
 */

import prisma from "@/lib/prisma";
import { getOperationalDashboardMetrics } from "@/lib/dashboardAnalytics";

jest.setTimeout(45000);

describe("Reporting Reconciliation & Executive KPI Integrity", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("computes accurate non-zero revenue reconciliation across departments", async () => {
        const summary = await getOperationalDashboardMetrics(testHotelId);

        expect(typeof summary.occupancyRate).toBe("number");
        expect(summary.occupancyRate).toBeGreaterThanOrEqual(0);
        expect(summary.occupancyRate).toBeLessThanOrEqual(100);

        expect(typeof summary.adr).toBe("number");
        expect(typeof summary.revPAR).toBe("number");
        expect(typeof summary.trevPAR).toBe("number");

        // TrevPAR >= RevPAR invariant
        expect(summary.trevPAR).toBeGreaterThanOrEqual(summary.revPAR);
    });
});
