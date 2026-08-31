/**
 * Timezone & Business Date Engine
 * ──────────────────────────────────────────────────────────────────────
 * Safe handling of hotel operational dates vs UTC database timestamps.
 * Prevents timezone off-by-one errors across global timezones.
 */

export const DEFAULT_HOTEL_TIMEZONE = "Asia/Kolkata";

/**
 * Format a Date or timestamp as YYYY-MM-DD in the hotel's operational timezone.
 */
export function formatHotelBusinessDate(
    date: Date | string | number,
    timeZone: string = DEFAULT_HOTEL_TIMEZONE
): string {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
        throw new Error("Invalid date provided for timezone formatting");
    }

    // Use Intl.DateTimeFormat with target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Parse a business date string (YYYY-MM-DD) into a UTC Date object
 * representing midnight at the start of that business day in the hotel's timezone.
 */
export function parseHotelBusinessDate(
    dateStr: string,
    timeZone: string = DEFAULT_HOTEL_TIMEZONE
): Date {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`Invalid date string format: ${dateStr}. Expected YYYY-MM-DD`);
    }

    const [year, month, day] = parts;

    // Construct local midnight in target timezone using Intl
    // Find the UTC timestamp that corresponds to year-month-day 00:00:00 in timeZone
    const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    
    // Get actual formatted date in timezone for utcGuess
    const localStr = formatHotelBusinessDate(utcGuess, timeZone);
    const [ly, lm, ld] = localStr.split("-").map(Number);

    const diffDays = (Date.UTC(year, month - 1, day) - Date.UTC(ly, lm - 1, ld)) / (1000 * 60 * 60 * 24);
    utcGuess.setUTCDate(utcGuess.getUTCDate() + diffDays);

    return utcGuess;
}

/**
 * Calculate difference in whole business nights between checkIn and checkOut dates.
 */
export function calculateBusinessNights(
    checkIn: Date | string,
    checkOut: Date | string,
    timeZone: string = DEFAULT_HOTEL_TIMEZONE
): number {
    const inStr = typeof checkIn === "string" ? checkIn.slice(0, 10) : formatHotelBusinessDate(checkIn, timeZone);
    const outStr = typeof checkOut === "string" ? checkOut.slice(0, 10) : formatHotelBusinessDate(checkOut, timeZone);

    const inDate = new Date(`${inStr}T00:00:00Z`);
    const outDate = new Date(`${outStr}T00:00:00Z`);

    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
}
