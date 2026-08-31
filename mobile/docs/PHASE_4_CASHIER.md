# StayOS Mobile Cashier Operations Specification

## 1. Scope & Overview
Phase 4 implements Cashier Shift management and multi-float drawer reconciliation on the official StayOS Android application (`com.stayos.operations`).

---

## 2. Server-Authoritative Ledger Invariants
* **Expected Cash Formula:**
  $$\text{Expected Cash} = \text{Opening Float} + \text{Folio Payments} + \text{Direct Sales} - \text{Refunds} - \text{Paid Outs} - \text{Cash Drops}$$
* **Variance Formula:**
  $$\text{Variance} = \text{Actual Counted Cash} - \text{Expected Cash}$$
* **Blind Count:** The cashier performs an unassisted physical cash count without pre-filling expected numbers.
* **Automated Audit Escalation:** When a cashier shift closes with non-zero variance ($\text{Variance} \neq 0$), the backend automatically requests managerial approval and logs audit entries.
