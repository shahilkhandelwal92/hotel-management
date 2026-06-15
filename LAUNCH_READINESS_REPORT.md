# Hotel Management SaaS Launch Readiness Report

**Assessment date:** June 14, 2026
**Decision:** **NO-GO**

## Executive Summary

The application now passes its production build, TypeScript compilation, Prisma schema validation, and seven focused unit tests. Critical defects were corrected in authentication, tenant scoping, reservations, folios, invoices, public portal sessions, integration tokens, and administrative access.

The platform is not ready for production launch because several release gates remain unverified or are known to fail. Most importantly, the active Prisma schema uses SQLite while the deployment documentation specifies PostgreSQL/Neon, statutory reports still return mock data, financial values use floating-point storage, legacy APIs still require systematic tenant/RBAC testing, and there is no meaningful end-to-end, concurrency, backup/restore, or performance evidence.

## Passed Gates

- `npm run build`: passed (111 application routes generated)
- `npm run typecheck`: passed
- `npm test`: passed (2 suites, 7 tests)
- `npx prisma validate`: passed
- `npx prisma generate`: passed
- Focused ESLint run for the changed security and transaction files: passed
- Production build no longer depends on downloading Google Fonts

## Critical Fixes Completed

- Normalized JWT sessions so legacy flat and newer nested session consumers agree.
- Enforced a minimum 32-character JWT secret in production.
- Removed the public production seed endpoint and known `password123` seed password.
- Fixed reservation creation rollback caused by an empty folio foreign key.
- Made reservation, room-block, and opening-folio creation atomic.
- Removed `skipDuplicates` from room blocks so concurrent conflicts roll back instead of silently overbooking.
- Added same-hotel checks for reservation rooms, rate plans, and guest profiles.
- Added tenant checks and soft deletion to reservation-by-ID operations.
- Added cancellation/no-show room-block cleanup.
- Added folio tenant checks, transaction sign validation, transfer validation, and close-balance validation.
- Replaced incorrect mixed-rate GST averaging with tested per-line tax aggregation.
- Added GSTIN and invoice line validation.
- Restricted billing, payroll, night audit, rate plans, SaaS changes, roles, permissions, hotels, staff, users, and events by role and tenant.
- Made user creation and role changes transactional with valid audit records.
- Replaced the Apnacomplex demo bearer-token bypass with signed, expiring JWTs.
- Added scoped corporate and guest portal cookies instead of exposing tenant APIs publicly.
- Added HMAC configuration checks and replay/duplicate protection for staff attendance QR.
- Added HMAC verification for internal/mock lock webhooks.

## Failed Or Unverified Release Gates

### P0: PostgreSQL Migration Is Not Rehearsed

The Prisma provider is now aligned to PostgreSQL/Neon and local Prisma commands consistently load `.env.local`. However, reviewed PostgreSQL migrations, constraints, transaction behavior, connection pooling, existing-data conversion, and production migration rollback have not been validated. No remote `db push` was performed during this assessment.

### P0: Statutory Reports Are Mock Data

The financial, GST, and compliance report APIs contain hard-coded sample hotels, 2024-25 figures, estimated tax/ITC values, and expired 2025 license dates. They must not be treated as accounting or compliance outputs.

### P0: Financial Accuracy Is Not Proven

- Money and tax fields use Prisma `Float`, which is unsuitable for authoritative accounting.
- Credit/debit note effects on revenue and GST reports are not fully reconciled.
- Reverse-charge, exemptions, refunds, payment reconciliation, and financial-year invoice sequencing lack complete tests.
- Payroll PT/TDS logic is simplified and is not a current state/regime-aware statutory engine.

### P0: Test Coverage Is Insufficient

Only seven unit tests exist. There are no automated tests for:

- tenant isolation and IDOR
- role/permission matrices
- reservation concurrency and overbooking
- invoice, payment, credit note, and folio reconciliation
- night-audit locks and reopen controls
- guest/corporate portal workflows
- payroll formulas
- exports and CSV isolation
- backup and restore

### P1: Legacy Quality Gate Fails

Full ESLint result:

- 269 errors
- 69 warnings
- 92 affected files

The largest category is 229 explicit-`any` errors, followed by unused variables and React effect/state issues.

### P1: Remaining Security Audit

Several legacy modules still require route-by-route RBAC and tenant verification, especially housekeeping, lost-and-found, CRM, attendance/leaves, HR salary/ITR, venues/BEO, POS updates, and settings routes. Middleware authentication alone does not prove object-level authorization.

### P1: Smart Access Is Not Production Integrated

ASSA ABLOY and Dormakaba providers are placeholders. The current provider is a mock implementation, and staff QR geofencing is documented as a future phase.

### P1: Operations Are Unverified

- No production backup/restore exercise
- No disaster recovery runbook
- No PostgreSQL migration rehearsal
- No Vercel deployment smoke test
- No monitoring/alerting validation
- No load-test results for the checklist targets

## Required Release Plan

1. Create reviewed PostgreSQL migrations, migrate a production-like copy, and run all checks against Neon.
2. Replace mock reports with ledger-backed queries and reconcile them against controlled accounting fixtures.
3. Convert financial storage/calculation to `Decimal` or integer paise with an explicit rounding policy.
4. Add integration tests for every tenant-scoped API and role matrix.
5. Add concurrent reservation and invoice-number tests against PostgreSQL.
6. Complete payment, refund, credit/debit note, night-audit, and export reconciliation tests.
7. Replace simplified payroll/GST assumptions with versioned, effective-date statutory configuration reviewed by a qualified Indian tax/payroll professional.
8. Resolve the full ESLint backlog and make build, typecheck, lint, tests, and Prisma validation mandatory CI checks.
9. Run seeded performance tests and document measured p50/p95/p99 latency.
10. Complete backup restore, incident response, and production smoke-test drills.

## Final Gate

Do not launch until all P0 items are closed and the master checklist has repeatable evidence for tenant isolation, financial reconciliation, GST accuracy, overbooking prevention, privilege control, audit integrity, performance, and recovery.
