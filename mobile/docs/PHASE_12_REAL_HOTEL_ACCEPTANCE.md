# StayOS Phase 12 — Real Hotel Operational Acceptance

## 1. Multi-Department Operational Acceptance Checklist

| Department | Operational Workflow | Verification Standard | Evidence Source |
| :--- | :--- | :--- | :--- |
| **Front Office** | Reservation $\rightarrow$ Allocation $\rightarrow$ Check-In | Atomic room occupancy lock & advance deposit posted | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Front Office** | In-Stay Room Relocation | Old room set to Dirty, new room set to Occupied | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Housekeeping** | Room Board Progression | Dirty $\rightarrow$ Cleaning $\rightarrow$ Clean $\rightarrow$ Inspected | `mobile/__tests__/housekeeping.test.ts` |
| **Housekeeping** | Minibar Consumption | Automated folio debit posting & stock deduction | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **F&B Dining** | Restaurant POS & KDS | 12-Table grid, 5% GST computation, live KDS queue | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Cashiering** | Shift Management | Opening float, safe drops, blind count & variance | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Engineering** | Work Order & OOO Lock | Asset breakdown, room set to Maintenance, dirty release | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Inventory** | Inter-Store Transfer | Central $\rightarrow$ Department store stock conservation | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Billing & Folio**| Zero-Balance Checkout | Debits equal Credits; checkout blocked if balance > 0 | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
| **Night Audit** | Business Day Rollover | Daily revenue aggregation, day lock & date rollover | `src/__tests__/firstPropertyProductionOnboarding.test.ts` |
