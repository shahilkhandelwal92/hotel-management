# StayOS Mobile Phase 5 Security & RBAC Enforcement Matrix

## 1. Security & RBAC Enforcement Matrix

| Feature / Action | UI Gatekeeper (`PermissionGate`) | Server Security Gatekeeper (`requirePermission`) | Status |
| :--- | :--- | :--- | :--- |
| **View Plant Assets** | `MAINTENANCE_VIEW` | `requirePermission(req, PERMISSIONS.MAINTENANCE_VIEW)` | **PASS** |
| **Create Work Order** | `MAINTENANCE_MANAGE` | `requirePermission(req, PERMISSIONS.MAINTENANCE_MANAGE)` | **PASS** |
| **Update / Complete WO** | `MAINTENANCE_MANAGE` | `requirePermission(req, PERMISSIONS.MAINTENANCE_MANAGE)` | **PASS** |
| **Log Parts Consumed** | `MAINTENANCE_MANAGE` | `requirePermission(req, PERMISSIONS.MAINTENANCE_MANAGE)` | **PASS** |
| **Register Plant Asset** | `MAINTENANCE_MANAGE` | `requirePermission(req, PERMISSIONS.MAINTENANCE_MANAGE)` | **PASS** |
| **View Stores & Transfers** | `STORE_VIEW` | `requirePermission(req, PERMISSIONS.STORE_VIEW)` | **PASS** |
| **Create Store Requisition** | `STORE_MANAGE` | `requirePermission(req, PERMISSIONS.STORE_MANAGE)` | **PASS** |
| **Dispatch / Receive Transfer**| `STORE_MANAGE` | `requirePermission(req, PERMISSIONS.STORE_MANAGE)` | **PASS** |
| **Register Inventory Store** | `STORE_MANAGE` | `requirePermission(req, PERMISSIONS.STORE_MANAGE)` | **PASS** |

---

## 2. Invariant Audits
* **Cross-Tenant Isolation:** Hotel A staff cannot view or mutate Hotel B assets, work orders, stores, or transfers (rejected with `403 Forbidden`).
* **OOO Room Protection:** Front desk room allocation is blocked for rooms in `Maintenance` status.
* **Conservation Invariant:** Stock transfer quantities are verified at issuance and receipt.
