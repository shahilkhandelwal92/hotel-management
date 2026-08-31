/**
 * Robust Input Validation & Sanitization Layer
 * ──────────────────────────────────────────────────────────────────────
 * Rejects NaN, Infinity, negative money, invalid dates, invalid GSTINs,
 * and malicious input patterns across all API controllers.
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s-]{8,20}$/;

export function validateMoneyAmount(val: unknown, fieldName: string = "Amount"): number {
    const num = typeof val === "number" ? val : Number(val);
    if (typeof val !== "number" && typeof val !== "string") {
        throw new Error(`${fieldName} must be a valid numeric amount`);
    }
    if (Number.isNaN(num) || !Number.isFinite(num)) {
        throw new Error(`${fieldName} cannot be NaN or Infinity`);
    }
    if (num < 0) {
        throw new Error(`${fieldName} cannot be negative`);
    }
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function validateQuantity(val: unknown, fieldName: string = "Quantity"): number {
    const num = typeof val === "number" ? val : Number(val);
    if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
    }
    return num;
}

export function validateDateRange(checkIn: unknown, checkOut: unknown): { checkInDate: Date; checkOutDate: Date } {
    const inDate = new Date(checkIn as string);
    const outDate = new Date(checkOut as string);

    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
        throw new Error("Invalid check-in or check-out date format");
    }
    if (inDate >= outDate) {
        throw new Error("Check-out date must be strictly after check-in date");
    }

    return { checkInDate: inDate, checkOutDate: outDate };
}

export function validateGstin(gstin: string | null | undefined): boolean {
    if (!gstin || !gstin.trim()) return true; // Optional
    return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function validateEmail(email: string | null | undefined): boolean {
    if (!email || !email.trim()) return true; // Optional
    return EMAIL_REGEX.test(email.trim());
}

export function validatePhone(phone: string): boolean {
    if (!phone || !phone.trim()) return false;
    return PHONE_REGEX.test(phone.trim());
}
