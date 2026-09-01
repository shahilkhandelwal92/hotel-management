# StayOS Real Hotel Property Onboarding Guide

## 1. Property Setup Workflow
* **Property Registration:** Create hotel entity with local legal entity name, GSTIN, and business address.
* **Timezone & Financial Settings:** Define local timezone (`Asia/Kolkata`) and base currency (`INR`).
* **Room Master Configuration:** Register physical room inventory across room types (Standard, Deluxe, Suites), floor numbers, and default base rates.
* **GST Tax Slabs:** Configure state and central GST tax slabs (e.g. 5% on F&B, 12%/18% on room tariffs).

---

## 2. Staff Account Provisioning Matrix

| Role | Permitted Workspaces | Key Constraints & Prohibitions |
| :--- | :--- | :--- |
| **FRONT_DESK** | Front Desk, Room Board, Check-In/Out, Folio | Cannot modify room base prices or approve own shift shortage |
| **CASHIER** | Cashier Shifts, Payment Receipts, Safe Drops | Cannot approve own variance or modify accounting configuration |
| **HOUSEKEEPING** | Room Board, Turnover Tasks, Minibar, Lost & Found | Cannot access guest financial statements or master invoices |
| **FNB_MANAGER / KITCHEN** | Restaurant Tables, Menu Catalog, Kitchen KDS | Cannot alter guest room tariffs or modify guest folios directly |
| **TECHNICIAN** | Work Orders, Plant Maintenance, OOO Lock | Cannot check in guests or release OOO rooms directly to Clean |
| **STOREKEEPER** | Requisitions, Stock Transfers, Warehouses | Cannot disburse cash or modify guest accounts |
| **MANAGER / ACCOUNTING** | Reports, Approvals, Shift Reconciliation, Night Audit | Full managerial oversight with multi-property security |
