# StayOS — Production Defect Log & Remediation History

**Document Reference**: `docs/PRODUCTION_DEFECT_LOG.md`  
**Generated Date**: August 31, 2026  
**Tracking Standard**: P0 (Launch Blocker), P1 (Critical), P2 (Major), P3 (Minor)  

---

## 1. Defect Severity Definitions

- **P0 — Launch Blocker**: Data corruption, duplicate payment, duplicate invoice, tenant leak, overbooking race condition, broken checkout, night audit duplication, production mock payment, security bypass.
- **P1 — Critical**: Major workflow failure, incorrect tax calculation, incorrect payroll deduction, incorrect recipe inventory deduction, broken corporate event flow, broken room lifecycle, missing audit trail.
- **P2 — Major**: Edge case failure, incorrect report filtering, unhandled network retry, operational inconvenience.
- **P3 — Minor**: Cosmetic issue, non-critical validation message, UI polish.

---

## 2. Comprehensive Defect Remediation Log

| Defect ID | Severity | Subsystem / Endpoint | Problem Description | Root Cause | Reproducible Test / Fix Commit | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | P0 | `/api/venues/[id]` | IDOR on venue deletion allowed any authenticated staff to delete venues of other hotels. | `findUnique({ where: { id } })` lacked `hotelId` tenant boundary check. | Added tenant verification + active booking check in `venues/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-002** | P0 | `/api/hr/settings/[id]` | IDOR on leave type deletion allowed deleting another hotel's leave quotas. | Direct delete by ID without property isolation. | Added `resolveTenantContext` and `hotelId` scoping in `hr/settings/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-003** | P0 | `/api/tax-config/[id]` | IDOR on tax configurations allowed modifying tax slabs of another hotel. | Missing property scoping on PUT and DELETE handlers. | Added property ownership verification in `tax-config/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-004** | P0 | `/api/reservations` | Overbooking race condition during concurrent booking attempts. | Concurrent threads could read vacant status simultaneously. | Implemented atomic transaction with PostgreSQL `@@unique([roomId, date])` in `reservations/route.ts`. Verified in `concurrencyOverbook.test.ts`. | **FIXED & VERIFIED** |
| **DEF-005** | P0 | `/api/billing/invoices` | Invoices could be marked as `Paid` without recorded payments. | State machine allowed arbitrary status update. | Restricted `Paid` status transition to verified payment settlements in `billing/invoices/route.ts`. | **FIXED & VERIFIED** |
| **DEF-006** | P1 | `/api/leads` | PATCH `/api/leads` lacked authentication check. | Handler omitted session and role verification. | Added `getSession` and `hasAnyRole(session, CRM_ROLES)` in `leads/route.ts`. | **FIXED & VERIFIED** |
| **DEF-007** | P1 | `/api/requests/[id]` | Service request charges and folio balances used floating-point JS numbers. | `Number(amount)` caused potential float truncation. | Replaced with `Prisma.Decimal` arithmetic in `requests/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-008** | P1 | `/api/roles/[id]` | Role permission updates were not atomic; active role deletion allowed. | Separate delete and create calls outside transaction. | Wrapped in single atomic `prisma.$transaction` and added active user check in `roles/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-009** | P1 | `/api/pos/orders` | Recipe ingredient deductions were not atomic, risking negative inventory. | Missing inventory validation before order placement. | Added atomic recipe consumption and HTTP 409 Conflict in `pos/orders/route.ts`. Verified in `stockMovement.test.ts`. | **FIXED & VERIFIED** |
| **DEF-010** | P1 | `/api/guests/verify/[id]` | Public guest scanner lacked brute-force protection. | No rate limiter on public QR lookup endpoint. | Added sliding-window rate limiting in `guests/verify/[id]/route.ts`. | **FIXED & VERIFIED** |
| **DEF-011** | P1 | `/api/access/staff-qr/verify` | Staff attendance accepted spoofed or missing GPS coordinates. | Geofence validation was simulated. | Integrated real Haversine formula against `hotel.latitude`/`longitude`/`geofenceRadius` in `staff-qr/verify/route.ts`. | **FIXED & VERIFIED** |
| **DEF-012** | P2 | `/api/settings/demo-mode` | Demo mode could fail-open in production. | Default fallback was permissive. | Enforced fail-closed default `false` in production in `settings/demo-mode/route.ts`. | **FIXED & VERIFIED** |

---

## 3. Defect Summary Metrics

- **Total P0 Defects Discovered**: 5 — **Total P0 Resolved**: 5 (100%)
- **Total P1 Defects Discovered**: 6 — **Total P1 Resolved**: 6 (100%)
- **Total P2 Defects Discovered**: 1 — **Total P2 Resolved**: 1 (100%)
- **Total P3 Defects Discovered**: 0 — **Total P3 Resolved**: 0
- **Unresolved P0/P1 Blockers**: **0**
