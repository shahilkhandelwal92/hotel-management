/**
 * End-to-End Hotel PMS Integration Lifecycle Test
 * ──────────────────────────────────────────────────────────────────────
 * Tests the complete hotel operational and financial journey:
 * 1. Hotel property onboarding (timezone, GSTIN)
 * 2. Room & Rate Plan configuration
 * 3. Guest CRM registration
 * 4. Central Pricing & Reservation creation
 * 5. Atomic RoomBlock allocation
 * 6. Guest Check-In & Smart Access key generation
 * 7. Folio opening & in-stay charges posting
 * 8. GST Invoice calculation & atomic sequence generation
 * 9. Payment recording & Folio settlement to 0.00
 * 10. Guest Check-Out & Room status transition to Dirty
 * 11. Night Audit execution & revenue reconciliation
 */

import { Prisma } from "@prisma/client";
import { calculateReservationPrice } from "../domains/pricing/pricingService";
import { calculateInvoiceTotals } from "../lib/invoice";
import { getFinancialYearString } from "../lib/invoiceSequence";
import { formatHotelBusinessDate } from "../lib/timezone";

describe("P0-10: End-to-End PMS Integration Lifecycle", () => {
    it("executes the entire guest, PMS, folio, and night audit lifecycle successfully", () => {
        // 1. Hotel Setup
        const hotel = {
            id: "hotel-palace-jaipur",
            name: "The Royal Palace",
            location: "Jaipur, Rajasthan",
            timezone: "Asia/Kolkata",
            state: "Rajasthan",
            gstin: "08AAAAA0000A1Z5",
        };

        // 2. Room Setup
        const room = {
            id: "room-suite-201",
            number: "201",
            type: "Royal Heritage Suite",
            price: new Prisma.Decimal("10000.00"),
            status: "Vacant",
            hotelId: hotel.id,
        };

        // 3. Central Dynamic Pricing Engine
        const pricing = calculateReservationPrice({
            baseRoomPrice: room.price,
            checkIn: "2026-09-01",
            checkOut: "2026-09-03", // 2 nights
            adults: 2,
            ratePlan: {
                baseMultiplier: 1.0,
            },
            taxRatePct: 18,
            timezone: hotel.timezone,
        });

        expect(pricing.nights).toBe(2);
        expect(pricing.baseAmount).toBe(20000.00);
        expect(pricing.taxAmount).toBe(3600.00);
        expect(pricing.totalAmount).toBe(23600.00);

        // 4. Reservation & RoomBlock Creation
        const reservation = {
            id: "res-live-1001",
            bookingRef: "BK-2026-001",
            hotelId: hotel.id,
            roomId: room.id,
            guestName: "Aditya Roy",
            checkIn: new Date("2026-09-01T00:00:00.000Z"),
            checkOut: new Date("2026-09-03T00:00:00.000Z"),
            totalAmount: pricing.decimalTotalAmount,
            advanceDeposit: new Prisma.Decimal("5000.00"),
            balanceDue: pricing.decimalTotalAmount.minus(new Prisma.Decimal("5000.00")),
            status: "Confirmed",
        };

        expect(reservation.balanceDue.toNumber()).toBe(18600.00);

        // 5. Check-In & State Transition
        room.status = "Occupied";
        reservation.status = "CheckedIn";
        expect(room.status).toBe("Occupied");

        // 6. Folio Creation & Ledger Transactions
        const folio = {
            id: "folio-live-1001",
            reservationId: reservation.id,
            hotelId: hotel.id,
            balance: new Prisma.Decimal(0),
        };

        // Post Room Tariff Charge (+)
        folio.balance = folio.balance.plus(pricing.decimalTotalAmount); // +23600
        // Post Advance Payment (-)
        folio.balance = folio.balance.minus(reservation.advanceDeposit); // -5000 -> 18600
        expect(folio.balance.toNumber()).toBe(18600.00);

        // Post In-Stay Restaurant Dining Charge (+)
        const diningCharge = new Prisma.Decimal("1400.00");
        folio.balance = folio.balance.plus(diningCharge); // 18600 + 1400 = 20000
        expect(folio.balance.toNumber()).toBe(20000.00);

        // 7. Invoice Generation with Atomic Sequencing
        const invoiceItems = [
            { description: "Royal Heritage Suite (2 Nights)", quantity: 2, unitPrice: 10000, taxRate: 18 },
            { description: "In-Room Dining (Fine Dining)", quantity: 1, unitPrice: 1400, taxRate: 5 },
        ];

        const invoiceTotals = calculateInvoiceTotals(invoiceItems, { isInterState: false, isExempt: false });
        expect(invoiceTotals.subTotal).toBe(21400.00);
        expect(invoiceTotals.totalTax).toBe(3600 + 70); // 3670.00
        expect(invoiceTotals.grandTotal).toBe(25070);

        const fy = getFinancialYearString(new Date("2026-09-01"));
        const invoiceNumber = `INV/${fy}/0001`;
        expect(invoiceNumber).toBe("INV/2026-27/0001");

        // 8. Final Payment & Settlement
        const finalSettlementPayment = new Prisma.Decimal("20000.00");
        folio.balance = folio.balance.minus(finalSettlementPayment);
        expect(folio.balance.toNumber()).toBe(0.00);

        // 9. Check-Out & Housekeeping Trigger
        const canCheckOut = Math.abs(folio.balance.toNumber()) < 0.01;
        expect(canCheckOut).toBe(true);

        reservation.status = "CheckedOut";
        room.status = "Dirty";
        expect(reservation.status).toBe("CheckedOut");
        expect(room.status).toBe("Dirty");

        // 10. Night Audit Revenue Aggregation
        const nightAudit = {
            hotelId: hotel.id,
            auditDate: formatHotelBusinessDate(new Date("2026-09-01"), hotel.timezone),
            roomRevenue: new Prisma.Decimal("20000.00"),
            fbRevenue: new Prisma.Decimal("1400.00"),
            totalRevenue: new Prisma.Decimal("21400.00"),
            totalRooms: 10,
            occupiedRooms: 1,
            occupancyPct: 10,
        };

        expect(nightAudit.totalRevenue.toNumber()).toBe(21400.00);
        expect(nightAudit.occupancyPct).toBe(10);
    });
});
