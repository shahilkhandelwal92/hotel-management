# STAYOS — FINAL EXCEPTION & HUMAN ERROR ACCEPTANCE AUDIT

**Audit Date:** September 1, 2026  
**Auditor:** Principal QA Lead & Security Architect  

---

## 1. Human Error & Operational Exception Matrix

| Operational Scenario | Injected Employee Mistake | Expected System Reaction | Actual System Reaction | Financial Impact | Audit Trail | Acceptance Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Check-in** | Assigning Dirty or Maintenance Room | System blocks assignment with validation error | Blocked with descriptive message | None (Protected) | N/A | **PASS** |
| **Cashiering** | Cashier float shortage on shift close | Automatically requires manager variance approval | Status set to `PENDING_APPROVAL` | Variance isolated | Created | **PASS** |
| **Cashiering** | Cashier attempts to approve own shortage | Rejected server-side with 403 Forbidden | Rejection with role error | None (Protected) | Attempt logged | **PASS** |
| **Folio Billing** | Adding negative price or invalid amount | Rejected with decimal validation error | Schema error / validation block | None (Protected) | N/A | **PASS** |
| **Invoicing** | Generating invoice for closed business date | Rejected with business date locked error | Blocked | None (Protected) | Attempt logged | **PASS** |
| **Procurement** | Vendor invoice price > approved PO price | Blocked during 3-way match | Throws 3-way price mismatch error | None (Protected) | Logged in AP | **PASS** |
| **Inventory** | Transferring more items than available | Blocked with insufficient stock error | Throws stock shortage error | None (Protected) | N/A | **PASS** |
| **Housekeeping** | Marking room clean without turnover | Inspection rejects without supervisor sign-off | Reverts to Dirty status | None (Protected) | Logged in HK | **PASS** |
| **Payments** | Submitting identical payment twice (double click)| Deduplicated via idempotency key | Exactly 1 payment posted, 1 deduplicated| Conserved balance | Logged in DB | **PASS** |
| **Cross-Tenant** | Querying resources of another hotel property | Rejected with 404 / 403 IDOR boundary | Returns `null` / throws error | None (Protected) | Blocked | **PASS** |
