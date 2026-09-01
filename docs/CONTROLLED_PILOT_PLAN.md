# StayOS Controlled Hotel Pilot Execution Plan

## 1. Executive Summary & Objective
The StayOS Controlled Hotel Pilot plan outlines the operational procedures for deploying the StayOS Enterprise Hotel PMS & Android Operations platform (`com.stayos.operations`) in a live, controlled single-property hotel environment.

---

## 2. Pilot Property Profile
* **Property Name:** StayOS Grand Pilot Hotel
* **Location:** New Delhi, India
* **Inventory:** 50 Rooms (Standard, Deluxe, Executive Suites)
* **Outlets:** Main Restaurant (12 tables), Kitchen KDS, Housekeeping Floor Pantries, Engineering Plant
* **Operating Currency / Timezone:** INR (₹) / `Asia/Kolkata` (UTC+05:30)

---

## 3. Operational Schedule (Simulated Day Cycle)

| Timeline | Department | Key Operations Executed | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **06:00** | Housekeeping | Room Board inspection, cleaning checklists, room release | `src/__tests__/controlledPilotValidation.test.ts` |
| **08:00** | Cashiering | Cash drawer opening float (₹5,000) verification | `src/__tests__/controlledPilotValidation.test.ts` |
| **09:00** | Front Desk | Arrivals search, room allocation, check-in, advance deposit | `src/__tests__/controlledPilotValidation.test.ts` |
| **11:00** | Front Desk | In-stay room relocation (P-101 $\rightarrow$ P-102), old room dirty | `src/__tests__/controlledPilotValidation.test.ts` |
| **13:00** | F&B / Restaurant| Table 4 dining order, KOT kitchen dispatch, room charge | `src/__tests__/controlledPilotValidation.test.ts` |
| **15:00** | Housekeeping | Minibar replenishment & automated folio charge posting | `src/__tests__/controlledPilotValidation.test.ts` |
| **16:00** | Engineering | Work order logging, Room 304 OOO lock, repair release | `src/__tests__/controlledPilotValidation.test.ts` |
| **17:00** | Stores | 40 Linen Bed Sheets transfer (Central $\rightarrow$ Floor Pantry) | `src/__tests__/controlledPilotValidation.test.ts` |
| **18:00** | Front Desk | Folio balance settlement (₹3,525), zero-balance checkout | `src/__tests__/controlledPilotValidation.test.ts` |
| **22:00** | Cashiering | Blind physical count close, variance escalation | `mobile/__tests__/cashier.test.ts` |
| **23:30** | Night Audit | Daily revenue aggregation, day locking & rollover | `src/__tests__/controlledPilotValidation.test.ts` |
