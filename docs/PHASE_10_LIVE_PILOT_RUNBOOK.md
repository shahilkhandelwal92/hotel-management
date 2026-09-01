# StayOS Phase 10 Live Pilot Runbook

## 1. Pilot Hotel Operational Configuration
* **Hotel Name:** StayOS Production Certified Hotel
* **Location:** Bengaluru, India (Timezone: `Asia/Kolkata`, Base Currency: `INR`)
* **Room Inventory:** Standard, Deluxe Suites, Executive Suites (Floors 1–4)
* **Outlets:** Main Dining Restaurant (Tables 1–12), Kitchen KDS, Housekeeping Floor Pantries, Engineering Maintenance Plant
* **Operating Roles:** Front Desk, Cashier, Housekeeping, Restaurant Waiters, Kitchen Chefs, Technicians, Storekeepers, Management

---

## 2. Daily Routine Execution Protocol
1. **05:00 - Night Audit Handover:** Verify business date rollover (D $\rightarrow$ D+1).
2. **06:00 - Housekeeping:** Inspect rooms on Room Board and update cleaning status.
3. **08:00 - Cashiering:** Open cash drawer with verified opening float (₹5,000.00).
4. **09:00 - Front Desk:** Check arrivals, assign rooms, collect advance deposits, and check in guests.
5. **12:00 - F&B & Room Service:** Record table/room orders, print KOTs, and advance KDS queue.
6. **14:00 - In-Stay Room Relocation:** Execute room moves with automatic dirty room turnover.
7. **16:00 - Engineering:** Log work orders, lock Out-of-Order rooms into `Maintenance`, and release to `Dirty` on repair completion.
8. **17:00 - Stores:** Process inter-store stock transfers with strict item balance conservation.
9. **18:00 - Departures:** Settle folio balances to exact ₹0.00 and execute checkout.
10. **23:59 - Night Audit:** Aggregate daily revenue, close business date, and roll over to D+1.
