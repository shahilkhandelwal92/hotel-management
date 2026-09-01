# StayOS Mobile Property Configuration & Production Data Audit

## 1. Audit Scope & Methodology
A full codebase forensic search was conducted across `mobile/src/` and `mobile/app/` to detect any hard-coded hotel IDs, store names, room numbers, tax rates, or mock tokens in production source files.

---

## 2. Findings Matrix

| Artifact / Pattern | Location | Classification | Remediation / Verification |
| :--- | :--- | :--- | :--- |
| `htl_...` hotel IDs | `mobile/__tests__/` | **TEST FIXTURE** | Verified test-only. Production code dynamically resolves hotel ID from authenticated user JWT. |
| Store Names | `mobile/app/(app)/inventory/` | **DYNAMIC** | Loaded from `GET /api/stores/transfers` for active hotel. |
| Room Numbers | `mobile/app/(app)/reservations/` | **DYNAMIC** | Loaded from `GET /api/rooms` for active hotel. |
| Menu Dishes & Tax Rates | `mobile/app/(app)/restaurant/` | **DYNAMIC** | Loaded from `GET /api/menu` and calculated server-side. |
| Plant Machinery Assets | `mobile/app/(app)/maintenance/` | **DYNAMIC** | Loaded from `GET /api/maintenance/assets` for active hotel. |

---

## 3. Multi-Property Tenancy Audit
* **Multi-Property Switching:** Staff users associated with multiple hotel properties can switch hotels via `/api/auth/switch-hotel`.
* **Cache Invalidation:** All TanStack Query cache keys are scoped to the active session; switching hotels purges existing cached state.
* **Audit Result:** **PASS (0 hard-coded production data leaks)**
