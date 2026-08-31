# STAYOS — FINAL ROLE OPERATIONAL ACCEPTANCE MATRIX

**Audit Date:** September 1, 2026  
**Auditor:** Principal Enterprise PMS Architect & Security Auditor  

---

## 1. 13 Staff Roles + 2 External Actors Verification Matrix

| Role | Primary UI Page | Core Daily Workflow | Allowed Actions | Explicitly Denied Actions | Segregation of Duties (SOD) Enforcement | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `/admin/onboarding` | Multi-Tenant Onboarding | Onboard hotels, manage global SaaS plans | Modifying hotel ledgers without context | Platform scoped | **PASS** |
| **OWNER** | `/owner/finance` | Financial Performance Review | View RevPAR, TrevPAR, P&L, approve capex | Overriding closed cashier drawer floats | Executive read scope | **PASS** |
| **HOTEL_ADMIN** | `/admin/dashboard` | Property Operations Management | Create staff, configure tax, decide approvals | Self-approval of personal expenses | Dual approval required | **PASS** |
| **MANAGER** | `/admin/dashboard` | Shift Operations & Escalations | Task assignment, room moves, rate plan overrides | Reopening closed audit days | Administrative limit | **PASS** |
| **FRONT_DESK** | `/admin/reservations` | Guest Check-In & Folios | Walk-in, Check-in, Room Move, Split Folios | Modifying past invoices or OOO holds | Front Office scoped | **PASS** |
| **CASHIER** | `/admin/billing/invoices` | Cashier Shifts & Tender Drops | Shift float open, tender collection, safe drop | Self-approval of cashier float shortages | Automatic approval req | **PASS** |
| **ACCOUNTING** | `/admin/reports/gst` | Ledger & Tax Accounting | AR billing, AP 3-way match, GST reports | Approving self-created purchase orders | Finance segregation | **PASS** |
| **HR** | `/admin/payroll` | Staff Workforce & Payroll | Attendance logging, leaves, salary/ITR | Altering room sales availability | HR scoped | **PASS** |
| **HOUSEKEEPING** | `/admin/housekeeping` | Room Turnover & Cleaning | Room cleaning, turnover inspection, L&F log | Viewing guest financial PII or ledger | Operational scoped | **PASS** |
| **KITCHEN** | `/restaurant/stock` | Kitchen KOTs & Prep | View KOT orders, mark ready, track stock | Direct guest folio adjustments | Kitchen scoped | **PASS** |
| **FNB_MANAGER** | `/restaurant/orders` | F&B POS & Table Billing | Table orders, KOT dispatch, split bills | Overriding room master rate structures | F&B scoped | **PASS** |
| **TECHNICIAN** | `/admin/monitoring` | Asset Repairs & Work Orders | Asset logs, work order tasks, OOO holds | Assigning clean rooms to guests | Engineering scoped | **PASS** |
| **STOREKEEPER** | `/admin/inventory` | Inventory Requisitions & Transit| Multi-store requisitions, transfers, counts | Creating financial cash payouts | Storekeeper scoped | **PASS** |
| **CORPORATE** | `/corporate/dashboard`| Corporate Event Management | Company bookings, negotiated rates, BEOs | Viewing other corporate accounts | Scoped corporate ID | **PASS** |
| **GUEST** | `/guest` | In-Stay Self-Service | Active stay view, room service, digital key | Querying other rooms, stays, or folios | Scoped stay token | **PASS** |
