# StayOS Phase 12 — Go-Live Chronological Runbook

## 1. Timeline & Checklist

### T-7 Days: Baseline Setup
* Create Hotel entity via Admin Portal (`POST /api/hotels`).
* Configure GST tax structures (5%, 12%, 18%) via `/admin/accounting/tax-config`.
* Setup room categories, base rates, and room inventory.
* Configure staff accounts and assign appropriate departmental roles.
* Create central and sub-store inventory accounts with opening stock levels.

### T-1 Day: Pre-Flight Verification
* Verify production HTTPS API connection on staff Android devices (`com.stayos.operations`).
* Conduct test login with each operational role (Front Desk, Cashier, Housekeeping, Waiter, Chef, Technician, Storekeeper).
* Verify that cash drawers are assigned and opening floats are ready.
* Validate active Neon backup snapshots.

### Go-Live Day (Day 0)
* **05:00:** Verify initial business date and room state synchronization.
* **07:00:** Cashier opens drawers with opening float verification.
* **09:00:** Front Desk begins live guest arrivals, advance deposit logging, and room check-ins.
* **12:00:** Restaurant POS and Kitchen KDS begin order processing.
* **18:00:** Guest folio settlements and zero-balance departures.
* **23:59:** Night Audit execution, daily revenue locking, and rollover to D+1.

### Post Go-Live (Day +1)
* Verify financial ledger balancing: $\text{Charges} - \text{Payments} - \text{Credits} = ₹0.00$.
* Inspect cashier shifts for unresolved variances.
* Review system APM logs for error spikes.
