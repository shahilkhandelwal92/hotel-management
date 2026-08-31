# StayOS — Production QA Baseline & Architecture Inventory

**Document Reference**: `docs/PRODUCTION_QA_BASELINE.md`  
**Generated Date**: August 31, 2026  
**System**: StayOS Hotel Management SaaS / PMS  
**Repository**: `shahilkhandelwal92/hotel-management`  

---

## 1. Executive Summary & Inventory Scope

This document establishes the real, verified technical baseline of StayOS across all modules, API routes, user interfaces, database entities, state machines, financial workflows, and security boundaries.

### Key Metrics:
- **Total Business Modules**: 18
- **Total Discovered API Routes**: 87 (`route.ts` endpoints)
- **Total User Interface Pages**: 52 (`page.tsx` routes)
- **Total Database Models**: 69 Prisma models
- **Supported Operational Roles**: 13 RBAC roles (`SUPER_ADMIN`, `OWNER`, `HOTEL_ADMIN`, `MANAGER`, `FRONT_DESK`, `ACCOUNTING`, `HR`, `KITCHEN`, `FNB_MANAGER`, `HOUSEKEEPING`, `STAFF`, `CORPORATE`, `GUEST`)

---

## 2. Business Modules Overview

1. **Authentication & Session Management**: Multi-property switching, JWT token issuance with 32+ char secret enforcement, secure HTTP-only cookies, role resolution.
2. **Property & Multi-Tenancy Engine**: Strict property isolation (`hotelId` scoping), property config, geographic coordinates, and geofencing radius.
3. **Core PMS & Reservations**: Room inventory, rate plans, room allocations, atomic `RoomBlock` locking, multi-channel booking source tracking.
4. **Front Desk & Access Control**: Check-in, check-out, room status synchronization, smart key issuance & instant revocation.
5. **Billing & Invoicing**: Continuous sequential numbering (`INV/YYYY-YY/####`), itemized line items, Indian GST statutory breakdown (CGST/SGST/IGST), PDF invoice generation.
6. **Folio & Guest Ledger**: Open/closed folio lifecycle, debit/credit ledger transactions, balance reconciliation, advance deposit adjustments.
7. **Payment Gateway Integration**: Multi-gateway support (Razorpay, Stripe, PayU, UPI), idempotency key enforcement (`PAY-###`), webhook signature verification, refund ledger tracking.
8. **Housekeeping Operations**: Real-time room status workflow (`Vacant`, `Occupied`, `Dirty`, `Cleaning`, `Inspected`, `Maintenance`), inspection checklists, auto-dirty triggers on checkout.
9. **Maintenance Department**: Room & asset defect reporting, maintenance status locking, resolution tracking, technician assignment.
10. **Restaurant & POS (F&B)**: Table orders, Room Service folio postings, KOT/KDS real-time pipelines, order item notes (spiciness, dietary).
11. **Kitchen Inventory & Recipe Costing**: `MenuItem` -> `RecipeIngredient` -> `GroceryStock` proportional deductions, out-of-stock atomic rejection, valuation tracking.
12. **HR, Staff & Attendance**: GPS Geofenced QR attendance with Haversine formula verification, shift allocations, leave management.
13. **Statutory Indian Payroll**: Basic salary, Allowances, PF, ESI, Professional Tax (PT), TDS (Sec 192B), LOP deductions, payslip generation.
14. **Corporate Events & Banquets**: Venue scheduling, package pricing, Banquet Event Order (BEO) generation, corporate attendee roster uploads.
15. **Event Scanner & QR Verification**: Single-use QR pass generation, brute-force rate-limiting, instant scanner attendance tracking.
16. **Guest Portal & Contactless Stay**: Mobile-friendly guest check-in, digital dining ordering, amenity slot reservations, service requests, bill review.
17. **Night Audit Engine**: Timezone-aware business day rolling, automated room tariff postings to open folios, `nightAuditId` idempotency tagging, revenue snapshotting.
18. **Executive Reports & Analytics**: Dynamic Indian Financial Year calculations (`YYYY-YY`), departmental P&L breakdown, GSTR-1 B2B/B2C tables, CSV/Excel/PDF exports.

---

## 3. Discovered API Route Matrix (87 Verified Endpoints)

| Route Path | Methods | Auth Required | Tenant Scoped | Primary Permission | Mutation | Financial Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/access/credentials` | GET, POST | Yes | Yes | `ROOM_VIEW` / `ROOM_UPDATE` | Yes (POST) | No |
| `/api/access/credentials/[id]` | GET, DELETE | Yes | Yes | `ROOM_VIEW` / `ROOM_UPDATE` | Yes (DELETE) | No |
| `/api/access/logs` | GET | Yes | Yes | `ROOM_VIEW` | No | No |
| `/api/access/staff-qr/generate` | GET | Yes | Yes | `STAFF_VIEW` | No | No |
| `/api/access/staff-qr/verify` | POST | Yes | Yes | `STAFF_UPDATE` | Yes | No |
| `/api/amenities` | GET, POST | Yes | Yes | `AMENITY_VIEW` / `AMENITY_MANAGE` | Yes (POST) | No |
| `/api/amenities/[id]` | PUT, DELETE | Yes | Yes | `AMENITY_MANAGE` | Yes | No |
| `/api/amenities/bookings` | GET, POST | Yes | Yes | `AMENITY_VIEW` / `AMENITY_BOOK` | Yes (POST) | Yes (Charges) |
| `/api/amenities/bookings/[id]` | DELETE | Yes | Yes | `AMENITY_MANAGE` | Yes | Yes (Reversals) |
| `/api/apnacomplex/auth` | POST | No (Token) | No | `API_INTEGRATION` | No | No |
| `/api/apnacomplex/billing` | POST | Yes | Yes | `BILLING_MANAGE` | Yes | Yes |
| `/api/attendance` | GET, POST | Yes | Yes | `HR_VIEW` / `HR_CREATE` | Yes (POST) | Yes (Payroll impact) |
| `/api/audit` | GET | Yes | Yes | `AUDIT_VIEW` | No | No |
| `/api/audit/timeline` | GET | Yes | Yes | `AUDIT_VIEW` | No | No |
| `/api/auth/hotels` | GET | Yes | No | `AUTH_SESSION` | No | No |
| `/api/auth/login` | POST | No | No | Public (Rate Limited) | Yes (Session) | No |
| `/api/auth/logout` | POST | Yes | No | `AUTH_SESSION` | Yes (Clear) | No |
| `/api/auth/me` | GET | Yes | No | `AUTH_SESSION` | No | No |
| `/api/auth/switch-hotel` | POST | Yes | Yes | `AUTH_SESSION` | Yes | No |
| `/api/billing/amenity-pdf` | POST | Yes | Yes | `INVOICE_VIEW` | No | No |
| `/api/billing/generate-pdf` | POST | Yes | Yes | `INVOICE_VIEW` | No | No |
| `/api/billing/invoices` | GET, POST, PUT, DELETE | Yes | Yes | `INVOICE_VIEW` / `INVOICE_CREATE` / `INVOICE_CANCEL` | Yes | Yes (Tax & Ledger) |
| `/api/corporate/events/[id]` | GET, PUT | Yes (Corporate Portal) | Yes | `CORPORATE_PORTAL` | Yes (PUT) | Yes |
| `/api/crm/guests` | GET, POST, PUT | Yes | Yes | `GUEST_VIEW` / `GUEST_CREATE` | Yes | No |
| `/api/dev/seed` | POST | Dev Only | Yes | `SUPER_ADMIN` | Yes | No |
| `/api/dev/session-test` | GET | Dev Only | No | `SUPER_ADMIN` | No | No |
| `/api/events` | GET, POST | Yes | Yes | `EVENT_VIEW` / `EVENT_MANAGE` | Yes (POST) | Yes (Package pricing) |
| `/api/events/[id]` | GET, PUT, DELETE | Yes | Yes | `EVENT_VIEW` / `EVENT_MANAGE` | Yes | Yes |
| `/api/events/beo` | GET, POST | Yes | Yes | `EVENT_VIEW` / `EVENT_MANAGE` | Yes (POST) | Yes (BEO Revenue) |
| `/api/events/verify/[accessCode]` | GET | No (Portal Code) | Yes | Public (Rate Limited) | No | No |
| `/api/export` | GET | Yes | Yes | `EXPORT_DATA` | No | No |
| `/api/feedback` | GET, POST | Yes | Yes | `FEEDBACK_VIEW` / `GUEST_VIEW` | Yes (POST) | No |
| `/api/finance` | GET | Yes | Yes | `REPORT_FINANCIAL` | No | Yes |
| `/api/folio` | GET, POST, PUT | Yes | Yes | `FOLIO_VIEW` / `FOLIO_ADJUST` | Yes | Yes (Ledger Transactions) |
| `/api/guest/amenities` | GET, POST | Yes (Guest Portal) | Yes | `GUEST_PORTAL` | Yes (POST) | Yes (Folio charges) |
| `/api/guest/orders` | GET, POST | Yes (Guest Portal) | Yes | `GUEST_PORTAL` | Yes (POST) | Yes (Room Service) |
| `/api/guest/payment` | POST | Yes (Guest Portal) | Yes | `GUEST_PORTAL` | Yes | Yes (Settlements) |
| `/api/guest/requests` | GET, POST | Yes (Guest Portal) | Yes | `GUEST_PORTAL` | Yes (POST) | No |
| `/api/guest/stay` | GET | Yes (Guest Portal) | Yes | `GUEST_PORTAL` | No | No |
| `/api/guests` | GET, POST | Yes | Yes | `GUEST_VIEW` / `GUEST_CREATE` | Yes (POST) | No |
| `/api/guests/[id]` | GET, PUT, DELETE | Yes | Yes | `GUEST_VIEW` / `GUEST_UPDATE` | Yes | No |
| `/api/guests/verify/[id]` | GET | No (QR / BookingRef) | Yes | Public (Rate Limited) | Yes (Portal Token) | No |
| `/api/health/dashboard` | GET | Yes | Yes | `DASHBOARD_VIEW` | No | No |
| `/api/hotels` | GET, POST | Yes | Super Admin | `HOTEL_MANAGE` | Yes (POST) | No |
| `/api/hotels/[id]` | GET, PUT, DELETE | Yes | Yes | `HOTEL_MANAGE` | Yes | No |
| `/api/housekeeping` | GET, POST, PUT, DELETE | Yes | Yes | `HOUSEKEEPING_VIEW` / `MANAGE` | Yes | No |
| `/api/housekeeping/lost-found` | GET, POST, PUT, DELETE | Yes | Yes | `LOST_FOUND_VIEW` / `MANAGE` | Yes | No |
| `/api/hr/itr` | GET, POST | Yes | Yes | `PAYROLL_VIEW` / `APPROVE` | Yes (POST) | Yes (TDS Records) |
| `/api/hr/itr/[id]` | PUT, DELETE | Yes | Yes | `PAYROLL_APPROVE` | Yes | Yes |
| `/api/hr/salary` | GET, POST | Yes | Yes | `PAYROLL_VIEW` / `APPROVE` | Yes (POST) | Yes (Salary Ledger) |
| `/api/hr/salary/[id]` | PUT, DELETE | Yes | Yes | `PAYROLL_APPROVE` | Yes | Yes |
| `/api/hr/settings` | GET, POST | Yes | Yes | `HR_SETTINGS_MANAGE` | Yes (POST) | No |
| `/api/hr/settings/[id]` | DELETE | Yes | Yes | `HR_SETTINGS_MANAGE` | Yes | No |
| `/api/kitchen/stock` | GET, POST, PUT | Yes | Yes | `KITCHEN_STOCK_VIEW` / `MANAGE` | Yes | Yes (Inventory Cost) |
| `/api/leads` | GET, POST, PATCH | Yes | Global / Tenant | `CRM_MANAGE` | Yes | Yes (Estimated value) |
| `/api/leaves` | GET, POST, PUT | Yes | Yes | `HR_VIEW` / `HR_UPDATE` | Yes | Yes (LOP Payroll) |
| `/api/locks/webhook` | POST | Webhook Signature | Yes | External Gateway | Yes | No |
| `/api/menu` | GET, POST | Yes | Yes | `POS_MENU_VIEW` / `MANAGE` | Yes (POST) | Yes (Pricing & Recipes) |
| `/api/menu/[id]` | PUT, DELETE | Yes | Yes | `POS_MENU_MANAGE` | Yes | Yes |
| `/api/night-audit` | GET, POST | Yes | Yes | `NIGHT_AUDIT_RUN` | Yes (POST) | Yes (Daily Room Tariffs) |
| `/api/onboarding/status` | GET, POST | Yes | Yes | `HOTEL_MANAGE` | Yes | No |
| `/api/payroll` | GET, POST, PUT | Yes | Yes | `PAYROLL_VIEW` / `APPROVE` | Yes | Yes (Payroll Payouts) |
| `/api/permissions` | GET | Yes | Yes | `ROLE_MANAGE` | No | No |
| `/api/pos/orders` | GET, POST, PUT | Yes | Yes | `POS_ORDER_VIEW` / `MANAGE` | Yes | Yes (F&B Revenue & Stock) |
| `/api/rate-plans` | GET, POST, PUT, DELETE | Yes | Yes | `RATE_PLAN_MANAGE` | Yes | Yes (Dynamic Tariffs) |
| `/api/reports/amenities` | GET | Yes | Yes | `REPORT_FINANCIAL` | No | Yes (Amenity CSV) |
| `/api/reports/analytics` | GET | Yes | Yes | `REPORT_FINANCIAL` | No | Yes (ADR/RevPAR) |
| `/api/reports/compliance` | GET | Yes | Yes | `REPORT_FINANCIAL` | No | Yes (Statutory Readiness) |
| `/api/reports/financial` | GET | Yes | Yes | `REPORT_FINANCIAL` | No | Yes (P&L, EBITDA) |
| `/api/reports/gst` | GET | Yes | Yes | `REPORT_GST` | No | Yes (GSTR-1, CGST/SGST/IGST) |
| `/api/requests` | GET, POST | Yes | Yes | `REQUEST_VIEW` / `CREATE` | Yes (POST) | No |
| `/api/requests/[id]` | PATCH | Yes | Yes | `REQUEST_MANAGE` | Yes | Yes (Folio Charges) |
| `/api/reservations` | GET, POST | Yes | Yes | `RESERVATION_VIEW` / `CREATE` | Yes (POST) | Yes (Room Tariffs) |
| `/api/reservations/[id]` | GET, PUT, DELETE | Yes | Yes | `RESERVATION_VIEW` / `UPDATE` / `CANCEL` | Yes | Yes (Room Blocks & Deposits) |
| `/api/roles` | GET, POST | Yes | Global / Property | `ROLE_MANAGE` | Yes (POST) | No |
| `/api/roles/[id]` | PUT, DELETE | Yes | Global / Property | `ROLE_MANAGE` | Yes | No |
| `/api/rooms` | GET, POST | Yes | Yes | `ROOM_VIEW` / `ROOM_CREATE` | Yes (POST) | Yes (Base Prices) |
| `/api/rooms/[id]` | GET, PUT, DELETE | Yes | Yes | `ROOM_VIEW` / `ROOM_UPDATE` / `DELETE` | Yes | No |
| `/api/saas/subscription` | GET, POST | Yes | Tenant Scoped | `OWNER` / `SUPER_ADMIN` | Yes | Yes (SaaS Billing) |
| `/api/settings/demo-mode` | GET, POST | Yes | Yes | `SUPER_ADMIN` / `OWNER` | Yes (Fail-closed) | No |
| `/api/settings/theme` | GET, POST | Yes | User Scoped | Any Authenticated | Yes | No |
| `/api/staff` | GET, POST, PUT, DELETE | Yes | Yes | `USER_MANAGE` | Yes | Yes (Salary assignments) |
| `/api/tax-config` | GET, POST | Yes | Yes | `TAX_CONFIG_VIEW` / `MANAGE` | Yes (POST) | Yes (GST Slabs) |
| `/api/tax-config/[id]` | PUT, DELETE | Yes | Yes | `TAX_CONFIG_MANAGE` | Yes | Yes |
| `/api/users` | GET, POST | Yes | Property / Super | `USER_MANAGE` | Yes (POST) | No |
| `/api/users/[id]` | PUT, DELETE | Yes | Property / Super | `USER_MANAGE` | Yes | No |
| `/api/venues` | GET, POST | Yes | Yes | `VENUE_VIEW` / `VENUE_MANAGE` | Yes (POST) | Yes (Base rentals) |
| `/api/venues/[id]` | DELETE | Yes | Yes | `VENUE_MANAGE` | Yes | Yes |

---

## 4. State Machines & Operational Transitions

### A. Room Operational State
```
┌─────────┐   Check-In    ┌──────────┐  Checkout   ┌───────┐
│ Vacant  │ ────────────> │ Occupied │ ──────────> │ Dirty │
└─────────┘               └──────────┘             └───────┘
     ▲                         │                       │ Clean Start
     │ Inspection Pass         │ In-Stay Service       ▼
┌───────────┐             ┌──────────┐             ┌──────────┐
│ Available │             │ Occupied │             │ Cleaning │
└───────────┘             └──────────┘             └──────────┘
     ▲                         │ Inspection Fail       │ Clean Finish
     │                         ▼                       ▼
     │                    ┌──────────┐             ┌───────────┐
     └─────────────────── │ Dirty    │ <────────── │ Inspected │
                          └──────────┘             └───────────┘
```

### B. Reservation Status Lifecycle
`Confirmed` ──(Check-In)──> `CheckedIn` ──(Checkout)──> `CheckedOut`  
`Confirmed` ──(Cancel / No-Show)──> `Cancelled` / `NoShow` (Releases RoomBlocks)

### C. Invoice State Lifecycle
`Draft` ──(Issue)──> `Issued` ──(Partial Payment)──> `Partially_Paid` ──(Settlement)──> `Paid`  
`Issued` / `Draft` ──(Cancel with INVOICE_CANCEL permission)──> `Cancelled`

### D. Housekeeping Task Lifecycle
`Pending` ──(Assign / Start)──> `InProgress` ──(Complete)──> `Completed`

---

## 5. Known Operational Risks & Mitigations

1. **Overbooking Races**: Addressed by atomic room allocation inserting `RoomBlock` rows with PostgreSQL `@@unique([roomId, date])`. Handled Prisma `P2002` error converting to HTTP 409 Conflict.
2. **Double Payment & Webhook Replay**: Addressed by client `idempotencyKey` tracking on `Payment` records and webhook deduplication logic.
3. **Cross-Tenant IDOR Attacks**: Addressed by mandatory `resolveTenantContext` and `findFirst({ where: { id, hotelId: tenant.hotelId } })` before any update or deletion.
4. **Night Audit Duplicate Billing**: Addressed by daily business date locking and tagging `nightAuditId` on every generated `FolioTransaction`.
5. **Floating-Point Truncation**: Addressed by strict `Prisma.Decimal` arithmetic across all 18 modules.
