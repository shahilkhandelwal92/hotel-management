import {
    formatHotelBusinessDate,
    parseHotelBusinessDate,
    calculateBusinessNights,
} from "../lib/timezone";

describe("P0-6: Timezone-Safe Hotel Business Date Operations", () => {
    it("formats dates accurately for Asia/Kolkata (IST)", () => {
        // 2026-09-01 19:00:00 UTC is 2026-09-02 00:30:00 IST
        const date = new Date("2026-09-01T19:00:00Z");
        const formatted = formatHotelBusinessDate(date, "Asia/Kolkata");
        expect(formatted).toBe("2026-09-02");
    });

    it("formats dates accurately across Asia/Dubai, Europe/London, and America/New_York", () => {
        // 2026-09-01 02:00:00 UTC
        const utcDate = new Date("2026-09-01T02:00:00Z");

        expect(formatHotelBusinessDate(utcDate, "Asia/Dubai")).toBe("2026-09-01"); // +4h -> 06:00
        expect(formatHotelBusinessDate(utcDate, "Europe/London")).toBe("2026-09-01"); // BST -> 03:00
        expect(formatHotelBusinessDate(utcDate, "America/New_York")).toBe("2026-08-31"); // EDT -> 22:00 (Previous day)
    });

    it("calculates exact stay nights regardless of server local clock", () => {
        const nights = calculateBusinessNights("2026-09-01", "2026-09-04", "Asia/Kolkata");
        expect(nights).toBe(3);
    });

    it("parses business date strings to UTC midnight correctly", () => {
        const parsed = parseHotelBusinessDate("2026-09-01", "Asia/Kolkata");
        expect(parsed.toISOString()).toContain("2026-09-01");
    });
});
