# STAYOS — FINAL ENTERPRISE TEST MATRIX

**Test Run Date:** August 31, 2026  
**Execution:** In-Band against live PostgreSQL / Neon  
**Summary:** 49 Test Suites | 166 Tests | 166 Passed | 0 Failed | 100% Success

---

## 1. Complete Test Suite Inventory & Results

| Suite Number | Test Suite File | Domain / Area | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `virtualHotelDaySimulation.test.ts` | 24-Hour Multi-Department Day Lifecycle | 1 | **PASS** |
| **2** | `deepAdversarialOperations.test.ts` | Adversarial Boundaries & Tamper Rejection | 9 | **PASS** |
| **3** | `enterpriseAdversarial.test.ts` | Double-Refund, Loyalty Overdraw, Credit Bounds | 3 | **PASS** |
| **4** | `approvalEngine.test.ts` | Multi-Step Hierarchy & Auto-Approvals | 4 | **PASS** |
| **5** | `taskEngine.test.ts` | Task Routing, Comments, State Traceability | 3 | **PASS** |
| **6** | `outboxEngine.test.ts` | Transactional Outbox & HMAC Webhooks | 2 | **PASS** |
| **7** | `splitFolio.test.ts` | Windows 1–4 & Charge Routing | 3 | **PASS** |
| **8** | `depositLifecycle.test.ts` | Advance Deposits & Folio Application | 3 | **PASS** |
| **9** | `noShow.test.ts` | No-Show Assessment & Room Release | 1 | **PASS** |
| **10** | `roomMove.test.ts` | Atomic Room Move & Housekeeping Turnover | 1 | **PASS** |
| **11** | `groupBlock.test.ts` | Group Blocks & Cutoff Date Release | 2 | **PASS** |
| **12** | `waitlist.test.ts` | Priority Queue & Reservation Conversion | 2 | **PASS** |
| **13** | `cashierShift.test.ts` | Cashier Shift Reconciliation & Variances | 2 | **PASS** |
| **14** | `arLedger.test.ts` | City Ledger, Credit Limits, 0–90+ Aging | 3 | **PASS** |
| **15** | `apThreeWayMatch.test.ts` | PO + GRN + Vendor Invoice 3-Way Match | 1 | **PASS** |
| **16** | `maintenance.test.ts` | Assets & Work Orders | 1 | **PASS** |
| **17** | `storeTransfers.test.ts` | Requisitions & Store Transfers | 1 | **PASS** |
| **18** | `linenMinibar.test.ts` | 4-State Linen & Folio Minibar Billing | 2 | **PASS** |
| **19** | `channelManager.test.ts` | OTA Rate/Room Mappings & Ingestion | 3 | **PASS** |
| **20** | `crmContracts.test.ts` | Sales Pipeline & Negotiated Corporate Rates | 2 | **PASS** |
| **21** | `communication.test.ts` | Templates & Multi-Channel Logs | 2 | **PASS** |
| **22** | `loyaltyLedger.test.ts` | Double-Entry Points Ledger & Tiers | 3 | **PASS** |
| **23** | `reputation.test.ts` | Guest Surveys & Automatic Recovery Tickets | 2 | **PASS** |
| **24** | `rateRestrictions.test.ts` | MinLOS, MaxLOS, CTA, CTD, Stop-Sell | 2 | **PASS** |
| **25** | `multiCurrency.test.ts` | Foreign Exchange & Multi-Currency Rates | 3 | **PASS** |
| **26** | `dashboardAnalytics.test.ts` | ADR, RevPAR, TrevPAR, Occupancy KPIs | 1 | **PASS** |
| **27** | `auth.test.ts` | Authentication & Password Hashing | 4 | **PASS** |
| **28** | `permissionAuth.test.ts` | DB-Driven RBAC & Role Hierarchies | 3 | **PASS** |
| **29** | `integrationLifecycle.test.ts` | End-to-End PMS Lifecycle | 4 | **PASS** |
| **30** | `smartAccess.test.ts` | Digital Key Encoding & Webhooks | 4 | **PASS** |
| **31** | `invoiceSequence.test.ts` | Gapless Sequential Invoice Numbering | 2 | **PASS** |
| **32** | `decimalMoney.test.ts` | Zero Floating-Point Currency Arithmetic | 5 | **PASS** |
| **33** | `tenantGuard.test.ts` | Multi-Tenant Data Isolation | 3 | **PASS** |
| **34** | `invoice.test.ts` | GST Calculation & Tax Invoices | 4 | **PASS** |
| **35** | `concurrencyOverbook.test.ts` | 100-Way Booking Concurrency Protection | 5 | **PASS** |
| **36** | `paymentIdempotency.test.ts` | Payment Idempotency & Replay Protection | 4 | **PASS** |
| **37** | `domainPricing.test.ts` | Dynamic Rate Calculation | 3 | **PASS** |
| **38** | `nightAudit.test.ts` | Business Day Roll & Room Posting | 5 | **PASS** |
| **39** | `e2eSmoke.test.ts` | System Smoke Test & Connectivity | 5 | **PASS** |
| **40** | `folio.test.ts` | Master Folio & Charge Lineage | 4 | **PASS** |
| **41** | `financialLedger.test.ts` | Double-Entry General Ledger | 4 | **PASS** |
| **42** | `roomBlocks.test.ts` | Room Block Calendar Locking | 4 | **PASS** |
| **43** | `apiAccess.test.ts` | API Security & Session Token Validation | 4 | **PASS** |
| **44** | `stockMovement.test.ts` | Inventory Stock In/Out Conservation | 4 | **PASS** |
| **45** | `timezone.test.ts` | Hotel Timezone & Calendar Boundaries | 3 | **PASS** |
| **46** | `portalAuth.test.ts` | Guest Portal OTP & Access Tokens | 3 | **PASS** |
| **47** | `payroll.test.ts` | Payroll, Salary Slips, Tax Deductions | 4 | **PASS** |
| **48** | `ratePlans.test.ts` | Seasonal Rate Rules | 4 | **PASS** |
| **49** | `financialReports.test.ts` | Departmental P&L & Revenue Reports | 4 | **PASS** |

**Total:** 49 Test Suites | 166 Tests | 166 Passed (100%)
