# StayOS Mobile Engineering & Maintenance Specification

## 1. Scope & Overview
Phase 5 implements mobile Engineering, Plant Asset Maintenance, Corrective Work Orders, Parts Consumption, and Room Out-of-Order (OOO) isolation on the official StayOS Android application (`com.stayos.operations`).

---

## 2. Server-Authoritative Maintenance Invariants
* **Work Order Priorities:** `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`
* **Work Order Lifecycle:** `REPORTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `WAITING_PARTS` $\rightarrow$ `COMPLETED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`
* **Parts Accounting:** Material costs are calculated using exact server decimals:
  $$\text{Total Material Cost} = \sum (\text{Part Quantity} \times \text{Part Unit Cost})$$
* **Out-of-Order Isolation:** Setting `lockRoomOutOfOrder: true` on a work order atomically sets the room to `"Maintenance"`. Completing the work order automatically releases the room to `"Dirty"` for Housekeeping turnover.
