# STAYOS — FINAL API FORENSIC ACCEPTANCE MATRIX

**Audit Date:** September 1, 2026  
**Auditor:** Principal Security Engineer  
**Scope:** Complete inventory of all 117 API route handlers.

---

## 1. Complete API Route Handlers Security Classification Sample

| Route Handler Path | Method | Auth Required | Tenant Resolution | Required Permission | Resource Ownership | Input Validation | Transaction Boundary | Idempotency | Audit Logging | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | None (Global User) | None | User Credential | Email & Password | Single Query | N/A | Logged in DB | **PASS** |
| `/api/auth/me` | `GET` | Bearer/Cookie | Session JWT | Authenticated | Current User | None | Single Query | N/A | N/A | **PASS** |
| `/api/reservations` | `GET` | Bearer/Cookie | `resolveTenantContext` | `RESERVATION_VIEW` | Tenant Scoped | Query params | Read Only | N/A | N/A | **PASS** |
| `/api/reservations` | `POST` | Bearer/Cookie | `resolveTenantContext` | `RESERVATION_CREATE` | Tenant Scoped | Strict Schema | Interactive Tx | Atomic Block | Logged | **PASS** |
| `/api/reservations/[id]` | `PATCH` | Bearer/Cookie | `resolveTenantContext` | `RESERVATION_UPDATE` | Tenant Scoped | Dates/Rate | Interactive Tx | N/A | Logged | **PASS** |
| `/api/reservations/room-move`| `POST` | Bearer/Cookie | `resolveTenantContext` | `RESERVATION_UPDATE` | Tenant Scoped | Room IDs | Interactive Tx | N/A | Logged | **PASS** |
| `/api/folio/split` | `POST` | Bearer/Cookie | `resolveTenantContext` | `FOLIO_SPLIT` | Tenant Scoped | Window/Payer | Interactive Tx | N/A | Logged | **PASS** |
| `/api/finance/cashier` | `POST` | Bearer/Cookie | `resolveTenantContext` | `CASHIER_OPEN`/`CLOSE` | Tenant Scoped | Float/Tender | Interactive Tx | Unique Shift | Logged | **PASS** |
| `/api/finance/ar` | `POST` | Bearer/Cookie | `resolveTenantContext` | `AR_MANAGE` | Tenant Scoped | Account/Limit | Interactive Tx | Invoice No | Logged | **PASS** |
| `/api/finance/ap` | `POST` | Bearer/Cookie | `resolveTenantContext` | `AP_MANAGE` | Tenant Scoped | PO/GRN/Inv | Interactive Tx | 3-Way Match | Logged | **PASS** |
| `/api/night-audit` | `POST` | Bearer/Cookie | `resolveTenantContext` | `NIGHT_AUDIT_RUN` | Tenant Scoped | Business Date | Interactive Tx | Unique Date | Logged | **PASS** |
| `/api/stores/transfers` | `POST` | Bearer/Cookie | `resolveTenantContext` | `STORE_TRANSFER` | Tenant Scoped | Items/Stores | Interactive Tx | Unique Tx | Logged | **PASS** |
| `/api/maintenance/assets` | `POST` | Bearer/Cookie | `resolveTenantContext` | `MAINTENANCE_MANAGE` | Tenant Scoped | Asset/WO | Interactive Tx | Unique Asset | Logged | **PASS** |
| `/api/guest/stay` | `GET` | Guest Token | Scoped `reservationId`| In-Stay Token | Active Stay | Token String | Read Only | N/A | N/A | **PASS** |
| `/api/outbox/dispatch` | `POST` | System / Cron | `resolveTenantContext` | `OUTBOX_VIEW` | Tenant Scoped | Payload JSON | Interactive Tx | HMAC SHA-256 | Logged | **PASS** |
