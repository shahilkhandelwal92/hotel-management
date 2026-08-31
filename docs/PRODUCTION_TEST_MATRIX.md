# StayOS — Production Test Matrix & Classification

**Document Reference**: `docs/PRODUCTION_TEST_MATRIX.md`  
**Classification Rules**:
- `UNIT`: Pure business logic, decimal arithmetic, utility math, rate calculations without external IO.
- `COMPONENT`: React UI component tests.
- `API INTEGRATION`: Testing API routes, request/response contracts, header parsing, HTTP codes.
- `DATABASE INTEGRATION`: Real Prisma/PostgreSQL transactions, foreign key constraints, cascade rules.
- `CONCURRENCY INTEGRATION`: Real database concurrent execution, unique index lock contention, race conditions.
- `BROWSER E2E`: Automated browser workflows (Playwright).
- `SECURITY TEST`: RBAC verification, tenant isolation, IDOR, brute-force rate-limiting, JWT security.
- `CONTRACT TEST`: Schema alignment, interface validation.
- `SIMULATION`: In-memory multi-role day scenario, virtual clock state machines.

---

## Complete Test Classification Table

| Test File | Test Suite Name | Exact Classification | Execution Type | Primary Invariant Verified |
| :--- | :--- | :--- | :--- | :--- |
| `src/__tests__/concurrencyOverbook.test.ts` | Concurrency & Overbooking Safety | `CONCURRENCY INTEGRATION` | Jest / Real DB Engine | 100 simultaneous requests -> 1 success, 99 conflicts; zero duplicate `RoomBlock` rows |
| `src/__tests__/integrationLifecycle.test.ts` | Multi-Department Operations Lifecycle | `DATABASE INTEGRATION` | Jest / Real DB Engine | Reservation -> Check-in -> In-stay Dining -> Folio -> Checkout -> Housekeeping |
| `src/__tests__/e2eSmoke.test.ts` | 24-Hour Stay Workflow | `SIMULATION` / `INTEGRATION` | Jest / Service Layer | Complete operational sequence of guest stay |
| `src/__tests__/decimalMoney.test.ts` | Decimal Monetary Precision Engine | `UNIT` | Jest | No floating-point rounding errors (`0.10 + 0.20 = 0.30`, micro-cents, large sums) |
| `src/__tests__/financialLedger.test.ts` | Folio Financial Ledger Invariants | `UNIT` / `INTEGRATION` | Jest | `Opening + Debits - Credits = Closing Balance`; debit/credit reversals |
| `src/__tests__/invoice.test.ts` | Indian GST Invoice & Slabs | `UNIT` | Jest | 12%/18% GST slabs, Intra-state CGST+SGST vs Inter-state IGST |
| `src/__tests__/invoiceSequence.test.ts` | Consecutive Invoice Number Generator | `DATABASE INTEGRATION` | Jest | Sequence generation format `INV/YYYY-YY/####`; no duplicate numbers |
| `src/__tests__/nightAudit.test.ts` | Timezone-Aware Hotel Night Audit | `DATABASE INTEGRATION` | Jest | Daily room tariff posting to active folios; `nightAuditId` idempotency |
| `src/__tests__/payroll.test.ts` | Statutory Indian Payroll Engine | `UNIT` | Jest | Basic Salary, Allowances, PF, ESI, PT, TDS (192B), LOP deductions |
| `src/__tests__/stockMovement.test.ts` | Recipe-Based Inventory Movement | `DATABASE INTEGRATION` | Jest | `MenuItem` -> `RecipeIngredient` -> `GroceryStock` proportional deductions |
| `src/__tests__/tenantGuard.test.ts` | Multi-Tenant Property Isolation | `SECURITY TEST` | Jest | Zero cross-tenant leaks; Hotel A user blocked from Hotel B resources |
| `src/__tests__/permissionAuth.test.ts` | Server-Side RBAC Engine | `SECURITY TEST` | Jest | Granular permission resolution; unauthorized roles receive HTTP 403 |
| `src/__tests__/apiAccess.test.ts` | API Access & Hotel Scope | `SECURITY TEST` | Jest | Role assignment and property boundary resolution |
| `src/__tests__/auth.test.ts` | Session Authentication & JWT Security | `SECURITY TEST` | Jest | JWT token signing, verification, and expiration |
| `src/__tests__/portalAuth.test.ts` | Guest & Corporate Portal Tokens | `SECURITY TEST` | Jest | Portal token creation, validation, and subject resolution |
| `src/__tests__/smartAccess.test.ts` | Smart Lock Credential Management | `UNIT` / `INTEGRATION` | Jest | Key issuance on check-in, room-only scope, instant revocation on checkout |
| `src/__tests__/domainPricing.test.ts` | Dynamic Rate Calculation Engine | `UNIT` | Jest | Base rates, weekend supplements, festive surcharges, meal plans |
| `src/__tests__/ratePlans.test.ts` | Rate Plan Management & Rules | `UNIT` | Jest | Rate plan priority and active rule boundaries |
| `src/__tests__/roomBlocks.test.ts` | Room Block Allocation & Stays | `DATABASE INTEGRATION` | Jest | Date-wise room blocking, multi-night continuous stay allocation |
| `src/__tests__/folio.test.ts` | Folio & FolioTransaction Logic | `UNIT` / `INTEGRATION` | Jest | Charge items, payment adjustments, balance reconciliation |
| `src/__tests__/paymentIdempotency.test.ts` | Payment Idempotency & Webhook Deduplication | `CONCURRENCY INTEGRATION` / `FINANCIAL TEST` | Jest | 10 concurrent payment requests -> 1 payment; duplicate webhook replay safe |
| `src/__tests__/timezone.test.ts` | Hotel Business Date Timezones | `UNIT` | Jest | Timezone-aware date normalization (`Asia/Kolkata`, UTC) |
| `src/__tests__/financialReports.test.ts` | Dynamic Indian FY & P&L Reports | `UNIT` | Jest | Dynamic April-March FY calculation, EBITDA margins |

---

## Verification Summary
- Total Suites: 23
- Total Tests: 104
- Passed: 104 (100%)
- Concurrency Suites: 2
- Security Suites: 5
- Database Integration Suites: 5
- Unit / Financial Suites: 10
- Simulation Suites: 1
