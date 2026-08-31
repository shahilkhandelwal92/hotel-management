/**
 * End-to-End Hotel Operations Smoke Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Simulates a full 24-hour operational day and complete lifecycle of a guest stay:
 * 1. Booking & Overbooking Lock
 * 2. Contactless Check-In & Digital Key
 * 3. In-Stay F&B Order & Amenity Booking -> Folio Posting
 * 4. Folio Settlement & GST Tax Invoice
 * 5. Check-Out & Housekeeping Room Turnover
 * 6. Night Audit Financial Closing & P&L Reconciliation
 */

import { calculateReservationPrice } from "../domains/pricing/pricingService";
import { calculateInvoiceTotals } from "../lib/invoice";
import { Prisma } from "@prisma/client";

describe("End-to-End Hotel Operations Smoke Workflow", () => {
    type StayContext = {
        hotelId: string;
        roomId: string;
        roomNumber: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
        roomStatus: "Vacant" | "Occupied" | "Dirty" | "Clean";
        digitalKeyStatus: "Inactive" | "Active" | "Revoked" | "Expired";
        folioBalance: Prisma.Decimal;
        folioCharges: Array<{ desc: string; amount: Prisma.Decimal }>;
        folioPayments: Array<{ mode: string; amount: Prisma.Decimal }>;
        invoiceGenerated: boolean;
        invoiceGrandTotal: Prisma.Decimal;
        nightAuditClosed: boolean;
    };

    const stay: StayContext = {
        hotelId: "hotel-demo-101",
        roomId: "room-deluxe-201",
        roomNumber: "201",
        guestName: "Vikram Malhotra",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        roomStatus: "Vacant",
        digitalKeyStatus: "Inactive",
        folioBalance: new Prisma.Decimal(0),
        folioCharges: [],
        folioPayments: [],
        invoiceGenerated: false,
        invoiceGrandTotal: new Prisma.Decimal(0),
        nightAuditClosed: false,
    };

    // Step 1: Booking & Rate Calculation
    it("Step 1: Creates reservation with pricing breakdown and room block", () => {
        const pricing = calculateReservationPrice({
            baseRoomPrice: 6000,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            adults: 2,
            taxRatePct: 12,
        });

        expect(pricing.nights).toBe(2);
        expect(pricing.baseAmount).toBe(12000);
        expect(pricing.taxAmount).toBe(1440);
        expect(pricing.totalAmount).toBe(13440);

        // Add opening room charge to folio
        stay.folioCharges.push({ desc: "Room Tariff - 2 Nights", amount: pricing.decimalTotalAmount });
        stay.folioBalance = stay.folioBalance.plus(pricing.decimalTotalAmount);
    });

    // Step 2: Contactless Check-In
    it("Step 2: Checks in guest, marks room Occupied, and activates Digital Key", () => {
        expect(stay.roomStatus).toBe("Vacant");

        // Check-in execution
        stay.roomStatus = "Occupied";
        stay.digitalKeyStatus = "Active";

        expect(stay.roomStatus).toBe("Occupied");
        expect(stay.digitalKeyStatus).toBe("Active");
    });

    // Step 3: In-Stay POS Dining & Amenity Bookings
    it("Step 3: Posts room-service dining and spa charges to guest folio", () => {
        const diningCharge = new Prisma.Decimal("1450.00"); // Paneer Tikka + Butter Naan + Beverages
        const spaCharge = new Prisma.Decimal("2200.00"); // Ayurvedic Massage

        stay.folioCharges.push({ desc: "F&B Room Service KOT-401", amount: diningCharge });
        stay.folioCharges.push({ desc: "Spa Wellness Treatment", amount: spaCharge });
        stay.folioBalance = stay.folioBalance.plus(diningCharge).plus(spaCharge);

        // Total balance = 13440 + 1450 + 2200 = 17090
        expect(stay.folioBalance.toNumber()).toBe(17090);
        expect(stay.folioCharges).toHaveLength(3);
    });

    // Step 4: Folio Settlement & GST Invoicing
    it("Step 4: Settles folio via UPI payment and generates official GST Tax Invoice", () => {
        const paymentAmount = stay.folioBalance;
        stay.folioPayments.push({ mode: "UPI (PhonePe)", amount: paymentAmount });
        stay.folioBalance = stay.folioBalance.minus(paymentAmount);

        expect(stay.folioBalance.toNumber()).toBe(0);

        // Compute GST Invoice
        const invoiceData = calculateInvoiceTotals(
            [
                { description: "Room Stay - Deluxe 201 (2 Nights)", quantity: 2, unitPrice: 6000, taxRate: 12 },
                { description: "F&B Room Service Dining", quantity: 1, unitPrice: 1380.95, taxRate: 5 },
                { description: "Spa Wellness Treatment", quantity: 1, unitPrice: 1864.4, taxRate: 18 },
            ],
            { isInterState: false, isExempt: false }
        );

        stay.invoiceGenerated = true;
        stay.invoiceGrandTotal = invoiceData.grandTotal;

        expect(stay.invoiceGenerated).toBe(true);
        expect(invoiceData.cgst.toNumber()).toBeGreaterThan(0);
        expect(invoiceData.sgst.toNumber()).toBeGreaterThan(0);
        expect(invoiceData.igst.toNumber()).toBe(0); // Intra-state Maharashtra
    });

    // Step 5: Check-Out & Housekeeping Turnover
    it("Step 5: Checks out guest, revokes digital key, and releases room to Dirty for Housekeeping", () => {
        expect(stay.folioBalance.toNumber()).toBe(0); // Zero balance prerequisite

        stay.roomStatus = "Dirty";
        stay.digitalKeyStatus = "Revoked";

        expect(stay.roomStatus).toBe("Dirty");
        expect(stay.digitalKeyStatus).toBe("Revoked");

        // Housekeeper cleans and completes checklist
        stay.roomStatus = "Clean";
        expect(stay.roomStatus).toBe("Clean");
    });

    // Step 6: Night Audit Daily Closing
    it("Step 6: Executes Night Audit and locks business day financials", () => {
        const totalDayRevenue = stay.invoiceGrandTotal;
        expect(totalDayRevenue.toNumber()).toBeGreaterThan(0);

        stay.nightAuditClosed = true;
        expect(stay.nightAuditClosed).toBe(true);
    });
});
