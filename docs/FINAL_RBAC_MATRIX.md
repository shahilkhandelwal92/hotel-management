# STAYOS — FINAL RBAC AUTHORIZATION MATRIX

**Audit Date:** August 31, 2026  
**Auditor:** Principal Security Engineer  

---

## 1. 13 Operational Roles Server-Side Authorization Matrix

| Operational Role | Department Scope | Allowed Read | Allowed Create | Allowed Update | Allowed Delete | Allowed Approval Level | Financial Ledger Access | Cross-Tenant Allowed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Platform | All Platform | All | All | All | Unlimited | Full Platform | Explicit Multi-Property |
| **OWNER** | Executive | Property Wide | Config/Users | Config | Selective | $\le$ ₹500,000 | Full Property | Own Properties Only |
| **HOTEL_ADMIN** | Management | Property Wide | Operations | Operations | Selective | $\le$ ₹100,000 | Full Property | Own Property Only |
| **MANAGER** | Operations | Operations/Staff| Res/Tasks | Res/Tasks | No | $\le$ ₹25,000 | Operational | Own Property Only |
| **FRONT_DESK** | Front Office | Front Office | Res/Folio/Key | Guest/Folio| No | None | Folio/Cashier | Own Property Only |
| **CASHIER** | Front/Outlet | Cashier Shifts | Payments | Shifts | No | None | Cashier Drawer | Own Property Only |
| **ACCOUNTING** | Finance | Ledger/Invoices| Invoices/AP | AR/AP/Tax | No | AP Match | Full Ledger/GST | Own Property Only |
| **HR** | HR / Admin | Staff/Payroll | Attendance/Leaves| Records | No | Leave/Payroll| Payroll Only | Own Property Only |
| **HOUSEKEEPING** | Housekeeping | Tasks/Rooms/Linen| Tasks/L&F | Task Status| No | None | None | Own Property Only |
| **KITCHEN** | F&B / Kitchen | KOTs/Recipes | Inventory Use| Order Status| No | None | None | Own Property Only |
| **FNB_MANAGER** | F&B Outlets | Menu/Orders/KOT| POS/Orders | Menu/Orders| No | $\le$ ₹5,000 | F&B Sales | Own Property Only |
| **TECHNICIAN** | Engineering | Work Orders | WO Tasks | WO Status | No | None | None | Own Property Only |
| **STOREKEEPER** | Stores/Purchase | Stock/Transfers | Requisitions | Transfers | No | Store Issue | Inventory Cost | Own Property Only |
| **CORPORATE** | External Client | Own Contracts | Event Requests| Company PII| No | None | Own Invoices | Scoped Company ID |
| **GUEST** | External Guest | Own Stay | Requests/Orders| Profile | No | None | Own Folio | Active Stay Only |

---

## 2. Server-Side Verification

All authorization decisions are enforced server-side via `resolveTenantContext` and `requirePermission` in API handlers. UI buttons are hidden for convenience, but the API rejects unauthorized access with `403 Forbidden` / `401 Unauthorized`. Verified in `permissionAuth.test.ts`, `apiAccess.test.ts`, `tenantAttack.test.ts`, and `rbacMatrix.test.ts`.
