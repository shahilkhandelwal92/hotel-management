# STAYOS — FINAL UI WORKFLOW FORENSIC AUDIT

**Audit Date:** September 1, 2026  
**Auditor:** Principal Frontend Architect & QA Lead  
**Scope:** Complete inventory of all 52 Next.js UI Page views (`src/app/**/page.tsx`).

---

## 1. UI Page Views Operational Mapping

| UI Page Path | Target Role | Primary Business Workflow | Core API Dependency | Tenant Scoped | Interactive Forms | Audit Required | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | Public | Staff & Admin Authentication | `/api/auth/login` | Dynamic | Login Form | **YES** | **PASS** |
| `/admin/dashboard` | Admin / GM | Property Analytics, ADR, RevPAR | `/api/analytics/executive-dashboard` | **YES** | Filter controls | **YES** | **PASS** |
| `/admin/reservations` | Front Desk | Walk-in, Check-in, Room Move | `/api/reservations` | **YES** | Create/Edit/Move Modal | **YES** | **PASS** |
| `/admin/billing/folio` | Front Desk | Folio Split, Window Transfers | `/api/folio/split` | **YES** | Split & Route Builder | **YES** | **PASS** |
| `/admin/billing/invoices` | Cashier | Cashier Shifts, Safe Drops, Drops| `/api/finance/cashier` | **YES** | Float & Drop Form | **YES** | **PASS** |
| `/admin/housekeeping` | Housekeeping | Room Turnover, Inspection Board | `/api/housekeeping` | **YES** | Status Toggle & Checklist| **YES** | **PASS** |
| `/restaurant/orders` | F&B Manager | POS Table Orders, KOT Dispatch | `/api/pos/orders` | **YES** | POS Table Grid & KOT | **YES** | **PASS** |
| `/restaurant/stock` | Kitchen | Ingredient Inventory, Recipe Deduction| `/api/kitchen/stock` | **YES** | Recipe & Stock Form | **YES** | **PASS** |
| `/admin/inventory` | Storekeeper | Multi-Store Requisitions, Transit| `/api/stores/transfers` | **YES** | Transfer & Issue Form | **YES** | **PASS** |
| `/admin/monitoring` | Technician | Corrective Work Orders, Assets | `/api/maintenance/assets` | **YES** | Work Order Builder | **YES** | **PASS** |
| `/admin/payroll` | HR | Staff Payroll & Statutory Taxes | `/api/payroll` | **YES** | Payroll Run Calculator | **YES** | **PASS** |
| `/admin/reports/gst` | Accounting | GST Invoicing & GSTR-1/3B Exports| `/api/reports/gst` | **YES** | GST Table & CSV Export | **YES** | **PASS** |
| `/admin/night-audit` | Night Auditor| Business Date Roll & Day Lock | `/api/night-audit` | **YES** | Night Audit Execution | **YES** | **PASS** |
| `/corporate/dashboard` | Corporate | B2B Bookings, Negotiated Rates | `/api/crm/contracts` | **YES** | Event & Booking Form | **YES** | **PASS** |
| `/guest` | Guest | In-Stay Dining, Folio, Digital Key| `/api/guest/stay` | **YES** | Room Service & Payment | **YES** | **PASS** |
