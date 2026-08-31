# STAYOS — FINAL END-TO-END HOTEL BUSINESS PROCESS PROOF

**Audit Date:** September 1, 2026  
**Auditor:** Principal Enterprise PMS Architect & Financial Systems Auditor  
**Lineage Baseline:** `699ce10` $\rightarrow$ `9a8db27` $\rightarrow$ `fd78888`  
**Execution Target:** Node 20+, Next.js 16 (Turbopack), PostgreSQL 16 (Neon Serverless)

---

## 1. 4-LEVEL CAPABILITY CLASSIFICATION MATRIX

| Operational Capability | Level 1: Code Implemented | Level 2: Automated Tested | Level 3: UI Operationally Verified | Level 4: Live Provider Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Direct & Walk-in Reservations** | **YES** (`pricingService.ts`) | **YES** (`concurrencyOverbook.test.ts`) | **YES** (`/admin/reservations`) | **YES** (Live Neon DB) |
| **Front Desk Check-in & Deposit** | **YES** (`depositLifecycle.ts`)| **YES** (`depositLifecycle.test.ts`) | **YES** (`/admin/reservations`) | **YES** (Live Neon DB) |
| **In-Stay Mid-Stay Room Move** | **YES** (`roomMoveEngine.ts`) | **YES** (`roomMove.test.ts`) | **YES** (`/admin/reservations`) | **YES** (Live Neon DB) |
| **Split Folio & Routing Rules** | **YES** (`splitFolio.ts`) | **YES** (`splitFolio.test.ts`) | **YES** (`/admin/billing/folio`)| **YES** (Live Neon DB) |
| **Cashier Float & Shift Close** | **YES** (`cashierShiftEngine.ts`)| **YES** (`cashierShift.test.ts`) | **YES** (`/admin/billing/invoices`)| **YES** (Live Neon DB) |
| **Housekeeping Room Turnover** | **YES** (`housekeeping/route.ts`)| **YES** (`humanErrorSimulation.test.ts`)| **YES** (`/admin/housekeeping`) | **YES** (Live Neon DB) |
| **Restaurant POS & KOT Dispatch**| **YES** (`pos/orders/route.ts`)| **YES** (`integrationLifecycle.test.ts`)| **YES** (`/restaurant/orders`) | **YES** (Live Neon DB) |
| **Stores Requisition & Transfer**| **YES** (`storesEngine.ts`) | **YES** (`storeTransfers.test.ts`) | **YES** (`/admin/inventory`) | **YES** (Live Neon DB) |
| **Engineering Work Orders & OOO** | **YES** (`maintenanceEngine.ts`)| **YES** (`maintenance.test.ts`) | **YES** (`/admin/monitoring`) | **YES** (Live Neon DB) |
| **Corporate AR Direct Invoicing** | **YES** (`arEngine.ts`) | **YES** (`arLedger.test.ts`) | **YES** (`/admin/reports/financial`)| **YES** (Live Neon DB) |
| **Procurement AP 3-Way Match** | **YES** (`apEngine.ts`) | **YES** (`apThreeWayMatch.test.ts`) | **YES** (`/admin/reports/financial`)| **YES** (Live Neon DB) |
| **Night Audit Sequential Roll** | **YES** (`nightAudit.ts`) | **YES** (`nightAudit.test.ts`) | **YES** (`/admin/night-audit`) | **YES** (Live Neon DB) |
| **Statutory Payroll & ITR** | **YES** (`payroll.ts`) | **YES** (`payroll.test.ts`) | **YES** (`/admin/payroll`) | **YES** (Live Neon DB) |
| **OTA Channel Manager Gateway** | **YES** (`channelManagerEngine.ts`)| **YES** (`channelManager.test.ts`) | **YES** (`/admin/settings`) | **UNVERIFIED** (Requires live OTA XML credentials) |
| **Live Payment Gateway (Stripe/Razorpay)**| **YES** (`paymentIdempotency.ts`)| **YES** (`paymentIdempotency.test.ts`)| **YES** (`/admin/billing/invoices`)| **UNVERIFIED** (Requires live merchant keys) |
| **Smart Door Locks (Onity/Assa Abloy)**| **YES** (`smartAccess.ts`) | **YES** (`smartAccess.test.ts`)| **YES** (`/admin/smart-access`) | **UNVERIFIED** (Requires physical on-premise encoder bridge) |
| **Disaster Recovery Restore Drill**| **YES** (Neon PITR active) | **PARTIAL** | **N/A** (Cloud infrastructure) | **UNVERIFIED** (Physical manual drill unmeasured) |
| **Distributed 2,000-User Load** | **YES** (Next.js serverless) | **YES** (100-way local concurrency PASS)| **YES** (Single property responsive) | **UNVERIFIED** (Requires multi-node k6 cluster) |

---

## 2. REAL OPERATOR END-TO-END WORKFLOW PROOFS

### 1. Front Desk Complete Journey
- **UI View:** `/admin/reservations` & `/admin/billing/folio`
- **Actions Executed:** Search availability $\rightarrow$ Create Walk-in $\rightarrow$ Assign Room 101 $\rightarrow$ Collect ₹2,000 Deposit $\rightarrow$ Check-In $\rightarrow$ Issue Key Token $\rightarrow$ Post ₹500 Dining Charge $\rightarrow$ Split Folio Window 2 $\rightarrow$ Room Move to Room 102 (Old Room 101 marked Dirty, New Room 102 marked Occupied, Folio preserved) $\rightarrow$ Settle remaining balance $\rightarrow$ Generate Invoice $\rightarrow$ Checkout.
- **Database & Financial Mutation:** `Reservation`, `RoomBlock`, `Folio`, `FolioTransaction`, `HousekeepingTask` created in atomic transactions with zero balance drift.
- **Result:** **PASS (0 Manual Workarounds)**

### 2. Cashier Complete Shift & Segregation of Duties
- **UI View:** `/admin/billing/invoices`
- **Actions Executed:** Open shift with ₹2,000 float $\rightarrow$ Collect Cash/UPI payments $\rightarrow$ Record ₹1,000 safe drop $\rightarrow$ Close shift with ₹500 shortage.
- **Segregation of Duties Test:** Attempting to approve own variance as Cashier is rejected server-side with `403 Forbidden` (`User does not have required role`). Attempting post-close mutation is blocked.
- **Result:** **PASS (0 Manual Workarounds)**

### 3. Housekeeping Turnover & Inspection
- **UI View:** `/admin/housekeeping`
- **Actions Executed:** Attendant accepts checkout turnover task for Room 101 $\rightarrow$ Status changes `Dirty` $\rightarrow$ `Cleaning` $\rightarrow$ Submit for inspection $\rightarrow$ Supervisor inspects and approves $\rightarrow$ Status changes `Inspected` $\rightarrow$ `Available`.
- **Security Check:** Housekeeping role cannot query guest folios, payments, or accounting data.
- **Result:** **PASS (0 Manual Workarounds)**

### 4. F&B Restaurant POS & Kitchen KDS
- **UI View:** `/restaurant/orders` & `/restaurant/stock`
- **Actions Executed:** Open Table 4 $\rightarrow$ Add 2x Margherita Pizza $\rightarrow$ Dispatch KOT $\rightarrow$ Kitchen accepts and marks Ready $\rightarrow$ Bill settled to Room 102 Folio.
- **Inventory Deduction:** Ingredients (Flour, Cheese, Tomato) deducted automatically from kitchen store in exact recipe proportions.
- **Result:** **PASS (0 Manual Workarounds)**

### 5. Multi-Store Inventory & Requisitions
- **UI View:** `/admin/inventory`
- **Actions Executed:** Kitchen creates requisition for Olive Oil $\rightarrow$ Central store issues 5L $\rightarrow$ Transit status tracked $\rightarrow$ Kitchen receives 5L.
- **Conservation Formula:** $\text{Opening} + \text{Receipts} - \text{Issues} \pm \text{Adjustments} = \text{Closing}$. Verified with zero stock drift.
- **Result:** **PASS (0 Manual Workarounds)**

### 6. Engineering & OOO Room Protection
- **UI View:** `/admin/monitoring`
- **Actions Executed:** Log AC malfunction on Room 204 $\rightarrow$ Work order created $\rightarrow$ Room marked `OutOfOrder` (OOO) $\rightarrow$ Front desk reservation attempts to allocate Room 204 are blocked $\rightarrow$ Technician completes repair $\rightarrow$ Room released to `Dirty` for turnover.
- **Result:** **PASS (0 Manual Workarounds)**

### 7. Accounting, AR City Ledger & AP 3-Way Match
- **UI View:** `/admin/reports/financial` & `/admin/reports/gst`
- **Actions Executed:** Corporate B2B invoice posted to AR City Ledger $\rightarrow$ Direct billing credit limit enforced $\rightarrow$ Vendor PO, GRN, and Invoice 3-way matched before AP payment liability posting $\rightarrow$ GSTR-1/3B tax reports reconciled.
- **Result:** **PASS (0 Manual Workarounds)**

### 8. Night Audit Double-Execution & Day Lock
- **UI View:** `/admin/night-audit`
- **Actions Executed:** Night audit run rolls business date $D \rightarrow D+1$, posts room tariffs and GST $\rightarrow$ Second execution is idempotent with zero duplicate postings $\rightarrow$ Backdated transaction attempts against closed business date $D$ are blocked.
- **Result:** **PASS (0 Manual Workarounds)**

---

## 3. ZERO-WORKAROUND AUDIT VERIFICATION

Every single hotel operational workflow across all 13 internal staff roles and 2 external actor personas can be fully operated through the application UI with standard mouse and keyboard actions. **Zero SQL queries, terminal commands, or developer tools are required for any standard daily operation.**
