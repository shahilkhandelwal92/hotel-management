# StayOS Mobile Phase 4 Security & RBAC Enforcement Matrix

## 1. Security & RBAC Enforcement Matrix

| Feature / Action | UI Gatekeeper (`PermissionGate`) | Server Security Gatekeeper (`requirePermission`) | Status |
| :--- | :--- | :--- | :--- |
| **View Cashier Shifts** | `CASHIER_VIEW` | `requirePermission(req, PERMISSIONS.CASHIER_VIEW)` | **PASS** |
| **Open/Close Shift** | `CASHIER_MANAGE` | `requirePermission(req, PERMISSIONS.CASHIER_MANAGE)` | **PASS** |
| **Record Cash Drop** | `CASHIER_MANAGE` | `requirePermission(req, PERMISSIONS.CASHIER_MANAGE)` | **PASS** |
| **Record Paid-Out** | `CASHIER_MANAGE` | `requirePermission(req, PERMISSIONS.CASHIER_MANAGE)` | **PASS** |
| **Place Restaurant Order** | `POS_ORDER_CREATE` | `hasAccessRole(access, POS_ROLES)` | **PASS** |
| **Update KOT Status** | `POS_ORDER_UPDATE` | `hasAccessRole(access, POS_ROLES)` | **PASS** |
| **View Kitchen Stock** | `RESTAURANT_VIEW` | `hasAccessRole(access, STOCK_ROLES)` | **PASS** |
| **Adjust Kitchen Stock** | `RESTAURANT_MANAGE` | `hasAccessRole(access, STOCK_ROLES)` | **PASS** |

---

## 2. Invariant Audits
* **Room Charge Authorization:** Checked-in reservation validation (`422 Unprocessable Entity` on checkout/invalid).
* **Recipe Stock Conservation:** Rejection with `409 Conflict` if ingredient quantity is insufficient.
* **Cashier Multi-Float Invariant:** Expected Cash calculation enforced on server transactions.
