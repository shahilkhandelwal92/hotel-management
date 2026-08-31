// Unit testing PMS date range calculation and room block overbooking prevention logic

function getDateRange(checkIn: Date, checkOut: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(checkIn);
    current.setHours(0, 0, 0, 0);
    const end = new Date(checkOut);
    end.setHours(0, 0, 0, 0);
    while (current < end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function formatDateKey(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

class MockRoomBlockStore {
    private blocks: Set<string> = new Set(); // Stores "roomId:YYYY-MM-DD"

    allocateBlocks(roomId: string, dates: Date[]): boolean {
        // Step 1: Check for any conflicting date block
        for (const d of dates) {
            const key = `${roomId}:${formatDateKey(d)}`;
            if (this.blocks.has(key)) {
                return false; // Conflict found (Overbooking attempt rejected)
            }
        }

        // Step 2: Atomic lock allocation
        for (const d of dates) {
            const key = `${roomId}:${formatDateKey(d)}`;
            this.blocks.add(key);
        }
        return true;
    }

    releaseBlocks(roomId: string, dates: Date[]) {
        for (const d of dates) {
            const key = `${roomId}:${formatDateKey(d)}`;
            this.blocks.delete(key);
        }
    }
}

describe("PMS Room Blocks & Overbooking Prevention", () => {
    describe("getDateRange expansion", () => {
        it("correctly generates daily date array for a standard 3-night stay", () => {
            const checkIn = new Date(2026, 8, 1); // 2026-09-01
            const checkOut = new Date(2026, 8, 4); // 2026-09-04
            const dates = getDateRange(checkIn, checkOut);

            expect(dates).toHaveLength(3);
            expect(formatDateKey(dates[0])).toBe("2026-09-01");
            expect(formatDateKey(dates[1])).toBe("2026-09-02");
            expect(formatDateKey(dates[2])).toBe("2026-09-03");
            // Checkout date 2026-09-04 is NOT blocked for that night so next guest can check in
        });

        it("handles month-end boundary crossing seamlessly", () => {
            const checkIn = new Date(2026, 7, 30); // 2026-08-30
            const checkOut = new Date(2026, 8, 2); // 2026-09-02
            const dates = getDateRange(checkIn, checkOut);

            expect(dates).toHaveLength(3);
            expect(dates.map(formatDateKey)).toEqual([
                "2026-08-30",
                "2026-08-31",
                "2026-09-01",
            ]);
        });

        it("handles year-end boundary crossing (Dec 31 to Jan 2)", () => {
            const checkIn = new Date(2026, 11, 31); // 2026-12-31
            const checkOut = new Date(2027, 0, 2); // 2027-01-02
            const dates = getDateRange(checkIn, checkOut);

            expect(dates).toHaveLength(2);
            expect(dates.map(formatDateKey)).toEqual([
                "2026-12-31",
                "2027-01-01",
            ]);
        });

        it("returns empty array when checkIn and checkOut are identical or invalid", () => {
            const checkIn = new Date(2026, 8, 1, 12);
            const checkOut = new Date(2026, 8, 1, 12);
            const dates = getDateRange(checkIn, checkOut);

            expect(dates).toHaveLength(0);
        });
    });

    describe("Overbooking prevention simulation", () => {
        it("allows consecutive non-overlapping bookings on the same room", () => {
            const store = new MockRoomBlockStore();
            const stay1Dates = getDateRange(new Date(2026, 8, 1), new Date(2026, 8, 3)); // 01, 02
            const stay2Dates = getDateRange(new Date(2026, 8, 3), new Date(2026, 8, 5)); // 03, 04

            expect(store.allocateBlocks("room-101", stay1Dates)).toBe(true);
            expect(store.allocateBlocks("room-101", stay2Dates)).toBe(true);
        });

        it("strictly blocks concurrent or overlapping booking attempts on the same room", () => {
            const store = new MockRoomBlockStore();
            const stay1Dates = getDateRange(new Date(2026, 8, 1), new Date(2026, 8, 4)); // 01, 02, 03
            const overlapStayDates = getDateRange(new Date(2026, 8, 2), new Date(2026, 8, 5)); // 02, 03, 04

            expect(store.allocateBlocks("room-101", stay1Dates)).toBe(true);
            // Overlapping booking MUST fail to protect inventory
            expect(store.allocateBlocks("room-101", overlapStayDates)).toBe(false);
        });

        it("frees room block when a reservation is cancelled", () => {
            const store = new MockRoomBlockStore();
            const dates = getDateRange(new Date(2026, 8, 10), new Date(2026, 8, 12));

            expect(store.allocateBlocks("room-202", dates)).toBe(true);
            // Cancel and release
            store.releaseBlocks("room-202", dates);
            // New booking should now succeed
            expect(store.allocateBlocks("room-202", dates)).toBe(true);
        });
    });
});
