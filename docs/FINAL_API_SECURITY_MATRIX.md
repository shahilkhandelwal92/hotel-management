# STAYOS — FINAL API SECURITY MATRIX

**Audit Date:** August 31, 2026  
**Auditor:** Principal Security Engineer  
**Scope:** Server-Side Authentication, Multi-Tenant Boundaries, and Permission Enforcement across all 117 API route handlers.

---

## 1. Comprehensive Endpoint Security Sample Matrix

| Route Handler Path | Method | Authentication | Tenant Isolation Scope | Required Permission | Transaction Boundary | Financial Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/reservations` | `GET` | Bearer Token / Session | `hotelId` via session | `RESERVATION_VIEW` | Read Only | None |
| `/api/reservations` | `POST` | Bearer Token / Session | `hotelId` via session | `RESERVATION_CREATE`| Interactive Tx (`RoomBlock` lock) | Advance Deposit |
| `/api/reservations/[id]` | `PATCH`| Bearer Token / Session | `hotelId` via session | `RESERVATION_UPDATE`| Interactive Tx | Rate / Dates |
| `/api/reservations/room-move`| `POST` | Bearer Token / Session | `hotelId` via session | `RESERVATION_UPDATE`| Interactive Tx (`RoomMoveEngine`)| Folio transfer |
| `/api/folio/split` | `POST` | Bearer Token / Session | `hotelId` via session | `FOLIO_SPLIT` | Interactive Tx (`SplitFolio`) | Window routing |
| `/api/finance/cashier` | `POST` | Bearer Token / Session | `hotelId` via session | `CASHIER_OPEN`/`CLOSE`| Interactive Tx (`CashierEngine`) | Float / Variance |
| `/api/finance/ar` | `POST` | Bearer Token / Session | `hotelId` via session | `AR_MANAGE` | Interactive Tx (`AREngine`) | City Ledger Post |
| `/api/finance/ap` | `POST` | Bearer Token / Session | `hotelId` via session | `AP_MANAGE` | Interactive Tx (`APEngine`) | Liability Post |
| `/api/night-audit` | `POST` | Bearer Token / Session | `hotelId` via session | `NIGHT_AUDIT_RUN` | Interactive Tx (`NightAudit`) | Daily Revenue Roll|
| `/api/stores/transfers` | `POST` | Bearer Token / Session | `hotelId` via session | `STORE_TRANSFER` | Interactive Tx (`StoresEngine`) | Inventory Cost |
| `/api/access/credentials` | `POST` | Bearer Token / Session | `hotelId` via session | `ROOM_VIEW` / In-House| Smart Lock Bridge | Access Token |
| `/api/guest/stay` | `GET` | Guest Portal Token | Scoped `reservationId` | Guest In-Stay Scope | Read Only | None |

---

## 2. Server-Side Enforcement Guarantee

1. **No Client-Supplied `hotelId` Trust:** All route handlers extract `hotelId` exclusively from the verified JWT/session via `resolveTenantContext(req)` or `getAuthoritativeUserContext`.
2. **IDOR Rejection:** Any URL parameter requesting an ID belonging to another hotel returns `404 Not Found` or `403 Forbidden` without exposing data.
