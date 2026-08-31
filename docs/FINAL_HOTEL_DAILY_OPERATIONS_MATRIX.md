# STAYOS — FINAL HOTEL DAILY OPERATIONS MATRIX

**Audit Date:** August 31, 2026  
**Scope:** Chronological mapping of every hotel operational process from morning shift opening to night audit roll.

---

## 1. Daily Operational Lifecycle Matrix

| Process | Actor | Initiator | Executor | Approver | Verifier | Reversal Authority | Financial Impact | Audit Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **06:00 Cashier Shift Open** | Cashier | Cashier | Cashier Engine | System | Front Desk Sup. | Hotel Admin | Float recorded | **YES** |
| **07:00 Breakfast KOT / POS** | Kitchen / F&B | Waiter | POS System | F&B Manager | Restaurant Head| F&B Manager | Revenue / Stock | **YES** |
| **08:00 Room Status Turnover**| Housekeeping | Attendant | HK Engine | HK Supervisor | Front Desk | HK Supervisor | None | **YES** |
| **09:00 Linen Laundry Dispatch**| Linen Keeper | Linen Attendant| Linen Engine| HK Supervisor | Central Store | HK Manager | None (Asset) | **YES** |
| **10:00 Pre-Arrival Check** | Front Desk | Agent | PMS | Front Desk Mgr | Front Desk Sup.| Front Desk Mgr | None | **YES** |
| **11:00 Guest Checkout** | Front Desk | Guest / Agent| Billing Engine| Front Desk | Accountant | Hotel Admin | Balance settlement| **YES** |
| **12:00 Room Move (Mid-Stay)** | Front Desk | Guest Complaint| Room Move Eng| Front Desk Sup.| HK Attendant | Front Desk Mgr | None (Folio trans)| **YES** |
| **13:00 Walk-In Booking** | Front Desk | Guest / Agent| Pricing Engine| Front Desk | Front Desk Sup.| Front Desk Mgr | Advance collected | **YES** |
| **14:00 Check-In & Digital Key**| Front Desk | Guest / Agent| Lock Adapter | Front Desk | System | Front Desk Mgr | Key Token issued | **YES** |
| **15:00 Store Requisition** | Kitchen / HK | Department | Stores Engine | Dept Head | Storekeeper | Central Store | Stock cost transf | **YES** |
| **16:00 PO 3-Way Match & AP** | Accounting | Vendor Invoice| AP Engine | Finance Head | Accountant | Hotel Admin | AP Liability | **YES** |
| **17:00 Corporate Direct Bill**| Accounting | Corporate B2B| AR Engine | Sales Head | Accountant | Hotel Admin | AR Ledger post | **YES** |
| **18:00 Minibar Billing** | Housekeeping | HK Attendant | Minibar Eng | System | Front Desk | Front Desk Mgr | Folio Charge | **YES** |
| **19:00 Banquet Dinner BEO** | Banquets / F&B| Event Host | Event Engine | Banquet Mgr | F&B Head | Hotel Admin | Banquet Revenue | **YES** |
| **20:00 Maintenance WO Repair**| Technician | Attendant / Eng| Maint Engine | Chief Engineer| Front Desk | Chief Engineer | Parts consumption| **YES** |
| **21:00 Shift Handover & Drop**| Cashier | Cashier | Cashier Engine| Front Desk Mgr | Accountant | Hotel Admin | Cash Drop | **YES** |
| **22:00 Service Recovery Comp** | Front Desk | GSA / Manager | Approval Eng | Hotel Admin | Accountant | Hotel Admin | Folio Adjustment | **YES** |
| **23:00 No-Show Cancellation** | Night Auditor| System / Agent| NoShow Engine| Night Auditor | Front Desk Mgr | Hotel Admin | Retention / Fee | **YES** |
| **00:00 Night Audit Roll** | Night Auditor| System / Agent| Audit Engine | Automatic / GM | Accountant | Owner / GM | Room rate & tax | **YES** |
| **00:05 Next Day Ledger Lock**| Night Auditor| System | Audit Engine | System | Accountant | Locked (Immutable)| Business Day Roll | **YES** |
