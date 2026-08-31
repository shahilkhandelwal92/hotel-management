# StayOS Mobile Phase 3 Security & Permission Audit

## 1. Security & RBAC Enforcement Matrix

| Front Desk Action | UI Gatekeeper (`PermissionGate`) | Server Security Gatekeeper (`requirePermission`) | Status |
| :--- | :--- | :--- | :--- |
| **View Reservations** | `RESERVATION_VIEW` | `requirePermission(req, PERMISSIONS.RESERVATION_VIEW)` | **PASS** |
| **Walk-In Booking** | `RESERVATION_CREATE` | `requirePermission(req, PERMISSIONS.RESERVATION_CREATE)` | **PASS** |
| **Check-In Guest** | `RESERVATION_CHECKIN` | `requirePermission(req, PERMISSIONS.RESERVATION_CHECKIN)` | **PASS** |
| **Cancel Booking** | `RESERVATION_CANCEL` | `requirePermission(req, PERMISSIONS.RESERVATION_CANCEL)` | **PASS** |
| **Room Move** | `RESERVATION_UPDATE` | `requirePermission(req, PERMISSIONS.RESERVATION_UPDATE)` | **PASS** |
| **View Folio Ledger**| `FOLIO_VIEW` | `requirePermission(req, PERMISSIONS.FOLIO_VIEW)` | **PASS** |
| **Post Charge/Pay** | `FOLIO_ADJUST` | `requirePermission(req, PERMISSIONS.FOLIO_ADJUST)` | **PASS** |
| **Split Folio Move** | `FOLIO_UPDATE` | `requirePermission(req, PERMISSIONS.FOLIO_UPDATE)` | **PASS** |
| **Guest Checkout** | `RESERVATION_CHECKOUT` | `requirePermission(req, PERMISSIONS.RESERVATION_CHECKOUT)`| **PASS** |

---

## 2. Multi-Tenant Isolation
* All mobile API calls inherit the authenticated staff user's hotel tenancy via JWT.
* Tampering with query parameters to access another hotel's reservations or folios returns a `403 Forbidden` response.
* Tenant isolation is verified by automated test suites.
