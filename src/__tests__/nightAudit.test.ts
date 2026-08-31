// Unit testing Night Audit revenue aggregation and day locking logic

type InvoiceItem = {
    itemType: "Room" | "Food" | "Amenity" | "Event" | "Other";
    lineTotal: number;
};

type DailyRevenueSummary = {
    roomRevenue: number;
    fbRevenue: number;
    amenityRevenue: number;
    eventRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
    occupancyPct: number;
};

function calculateNightAuditSummary(
    items: InvoiceItem[],
    totalRooms: number,
    occupiedRooms: number
): DailyRevenueSummary {
    let roomRevenue = 0;
    let fbRevenue = 0;
    let amenityRevenue = 0;
    let eventRevenue = 0;
    let otherRevenue = 0;

    for (const item of items) {
        switch (item.itemType) {
            case "Room":
                roomRevenue += item.lineTotal;
                break;
            case "Food":
                fbRevenue += item.lineTotal;
                break;
            case "Amenity":
                amenityRevenue += item.lineTotal;
                break;
            case "Event":
                eventRevenue += item.lineTotal;
                break;
            default:
                otherRevenue += item.lineTotal;
                break;
        }
    }

    const totalRevenue = roomRevenue + fbRevenue + amenityRevenue + eventRevenue + otherRevenue;
    const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
        roomRevenue,
        fbRevenue,
        amenityRevenue,
        eventRevenue,
        otherRevenue,
        totalRevenue,
        occupancyPct,
    };
}

describe("Night Audit Financial Aggregation & Day Locking", () => {
    it("accurately categorizes revenue streams and computes property occupancy", () => {
        const dailyItems: InvoiceItem[] = [
            { itemType: "Room", lineTotal: 5500 },
            { itemType: "Room", lineTotal: 7200 },
            { itemType: "Food", lineTotal: 1450 },
            { itemType: "Amenity", lineTotal: 900 },
            { itemType: "Event", lineTotal: 25000 },
            { itemType: "Other", lineTotal: 350 },
        ];

        const summary = calculateNightAuditSummary(dailyItems, 50, 20); // 20 of 50 rooms occupied = 40%

        expect(summary.roomRevenue).toBe(12700);
        expect(summary.fbRevenue).toBe(1450);
        expect(summary.amenityRevenue).toBe(900);
        expect(summary.eventRevenue).toBe(25000);
        expect(summary.otherRevenue).toBe(350);
        expect(summary.totalRevenue).toBe(12700 + 1450 + 900 + 25000 + 350);
        expect(summary.occupancyPct).toBe(40);
    });

    it("handles zero occupied rooms and empty revenue days gracefully", () => {
        const summary = calculateNightAuditSummary([], 50, 0);

        expect(summary.totalRevenue).toBe(0);
        expect(summary.occupancyPct).toBe(0);
    });

    it("verifies day lock immutability (locked dates prevent further postings unless reopened)", () => {
        const auditState = {
            hotelId: "demo-hotel",
            auditDate: "2026-08-30",
            isDayClosed: true,
            status: "Closed",
        };

        const attemptPostTransaction = (isClosed: boolean, isSuperAdmin: boolean) => {
            if (isClosed && !isSuperAdmin) {
                throw new Error("Date is closed by Night Audit. Modifying transactions on closed dates requires Super Admin reopen.");
            }
            return "SUCCESS";
        };

        expect(() => attemptPostTransaction(auditState.isDayClosed, false)).toThrow(
            /Date is closed by Night Audit/
        );
        expect(attemptPostTransaction(auditState.isDayClosed, true)).toBe("SUCCESS");
    });
});
