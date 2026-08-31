# STAYOS — FINAL DEPARTMENT HANDOFF AUDIT

**Audit Date:** September 1, 2026  
**Auditor:** Principal Enterprise PMS Architect & Lead QA Auditor  

---

## 1. Cross-Department Information Propagation Matrix

| Originating Department | Target Department | Operational Trigger | Information Transferred | UI Visible? | Automatic Propagation? | Manual Workaround? | Audit Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Reservations / Sales** | **Front Desk** | Reservation Created / Modified | Guest PII, Rate Plan, Room Type, Deposit | **YES** | **YES** (Instant DB State) | **NO** | **PASS** |
| **Front Desk** | **Housekeeping** | Guest Checkout / Room Move | Room marked Dirty, Turnover task created | **YES** | **YES** (Auto task dispatch)| **NO** | **PASS** |
| **Housekeeping** | **Front Desk** | Supervisor Approval of Clean Room | Room marked Clean / Inspected | **YES** | **YES** (Instant availability)| **NO** | **PASS** |
| **F&B Restaurant** | **Front Desk (Folio)** | Guest Charges Meal to Room | Food & Beverage charge with KOT reference | **YES** | **YES** (Interactive Tx) | **NO** | **PASS** |
| **F&B Restaurant** | **Kitchen Stores** | Order Settled / Prepared | Recipe ingredients deducted from kitchen store | **YES** | **YES** (Automatic recipe calc)| **NO** | **PASS** |
| **Central Store** | **Procurement / AP** | Inventory Stock Low Threshold | Purchase Requisition created | **YES** | **YES** (Auto PR trigger) | **NO** | **PASS** |
| **Procurement / PO** | **Accounting (AP)** | GRN Received from Vendor | PO + GRN + Vendor Invoice 3-way match | **YES** | **YES** (Interactive Tx) | **NO** | **PASS** |
| **Cashier** | **Accounting (GL)** | Cashier Shift Closed with Variance | Cash drop recorded, shortage approval dispatched| **YES** | **YES** (Auto approval req) | **NO** | **PASS** |
| **Corporate Sales** | **Accounting (AR)** | Corporate Event BEO Settled | AR direct invoice posted to City Ledger | **YES** | **YES** (Interactive Tx) | **NO** | **PASS** |
| **Engineering** | **Front Desk** | Asset Defect / Work Order Logged| Room marked Out-Of-Order (OOO) | **YES** | **YES** (Blocks allocations) | **NO** | **PASS** |
| **Night Audit** | **Accounting & GM** | Midnight Business Day Rollover | Room charges posted, business date locked | **YES** | **YES** (Automatic roll) | **NO** | **PASS** |
