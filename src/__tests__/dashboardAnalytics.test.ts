/**
 * KPI Analytics & Executive Dashboard Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies calculation of ADR, RevPAR, TrevPAR, Occupancy %,
 * and departmental revenue metrics.
 */

import { getOperationalDashboardMetrics } from "@/lib/dashboardAnalytics";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Executive Dashboard & KPI Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("computes operational dashboard metrics with non-negative numbers", async () => {
        const metrics = await getOperationalDashboardMetrics(testHotelId);

        expect(metrics.totalRooms).toBeGreaterThanOrEqual(0);
        expect(metrics.occupancyRate).toBeGreaterThanOrEqual(0);
        expect(metrics.occupancyRate).toBeLessThanOrEqual(100);
        expect(metrics.adr).toBeGreaterThanOrEqual(0);
        expect(metrics.revPAR).toBeGreaterThanOrEqual(0);
        expect(metrics.trevPAR).toBeGreaterThanOrEqual(0);
        expect(metrics.departmentalBreakdown.roomRevenue).toBeGreaterThanOrEqual(0);
        expect(metrics.departmentalBreakdown.fnbRevenue).toBeGreaterThanOrEqual(0);
        expect(metrics.operationalHealth.openWorkOrders).toBeGreaterThanOrEqual(0);
    });
});
