# STAYOS — FINAL HOTEL ROLE & RBAC SEGREGATION OF DUTIES AUDIT

**Audit Date:** August 31, 2026  
**Auditor:** Principal Hotel PMS Architect & Security Engineer  
**Role Matrix:** 13 Operational Roles & Department Hierarchy

---

## 1. Role Responsibility & Segregation of Duties Matrix

| Role | Department | Can View | Can Create | Can Edit | Can Delete | Can Approve | Can Refund | Can Discount | Financial Ledger Access | Guest PII Access | Multi-Tenant Access |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Platform | All Platform | All | All | All | All Levels | YES | YES | Full Platform | Full | Explicit Multi-Property |
| **OWNER** | Executive | Property Wide | Config/Users | Config | Selective | $\le$ ₹500,000 | YES | YES | Full Property | Full | Own Properties Only |
| **HOTEL_ADMIN** | Management | Property Wide | Operations | Operations | Selective | $\le$ ₹100,000 | YES | YES | Full Property | Full | Own Property Only |
| **MANAGER** | Duty Ops | Operations/Staff| Res/Tasks | Res/Tasks | No | $\le$ ₹25,000 | With Policy | $\le$ 20% | Operational | Full | Own Property Only |
| **FRONT_DESK** | Front Office | Front Office | Res/Folio/Key | Guest/Folio| No | No | Up to Deposit| With Approval| Folio/Cashier | Stay/PII | Own Property Only |
| **CASHIER** | Front/Outlet | Cashier Shifts | Payments | Shifts | No | No | No | No | Cashier Drawer | Minimal | Own Property Only |
| **ACCOUNTING** | Finance | Ledger/Invoices| Invoices/AP | AR/AP/Tax | No | AP Match | Approved Only| No | Full Ledger/GST | Invoicing Only | Own Property Only |
| **HR** | HR / Admin | Staff/Payroll | Attendance/Leaves| Records | No | Leave/Payroll| No | No | Payroll Only | Staff PII Only | Own Property Only |
| **HOUSEKEEPING** | Housekeeping | Tasks/Rooms/Linen| Tasks/L&F | Task Status| No | No | No | No | None | Room Info Only | Own Property Only |
| **KITCHEN** | F&B / Kitchen | KOTs/Recipes | Inventory Use| Order Status| No | No | No | No | None | None | Own Property Only |
| **FNB_MANAGER** | F&B Outlets | Menu/Orders/KOT| POS/Orders | Menu/Orders| No | $\le$ ₹5,000 | F&B Only | $\le$ 15% | F&B Sales | Dining Info | Own Property Only |
| **TECHNICIAN** | Engineering | Work Orders | WO Tasks | WO Status | No | No | No | No | None | None | Own Property Only |
| **STOREKEEPER** | Stores/Purchase | Stock/Transfers | Requisitions | Transfers | No | Store Issue | No | No | Inventory Cost | None | Own Property Only |
| **CORPORATE** | External Client | Own Contracts | Event Requests| Company PII| No | No | No | No | Own Invoices | Own Attendees | Scoped Company ID |
| **GUEST** | External Guest | Own Stay | Requests/Orders| Profile | No | No | No | No | Own Folio | Self Only | Active Stay Only |

---

## 2. Segregation of Duties Enforcements

1. **Front Desk vs Accounting:** Front Desk agents cannot modify general ledger tax rules or delete posted invoices.
2. **Housekeeping Protection:** Housekeeping attendants cannot mark occupied rooms as vacant or alter room billing tariffs.
3. **Cashier Drawer Separation:** Cashiers cannot self-approve cash variance shortages; non-zero variances trigger an immutable `ApprovalRequest` routed to Hotel Admin / Manager.
4. **Kitchen Isolation:** Kitchen staff cannot post discretionary credits or modify room stay rates.
5. **Guest Portal Containment:** Guest sessions resolve via `portalAuth.ts` and are cryptographically bounded to the active `reservationId` and `hotelId`.
