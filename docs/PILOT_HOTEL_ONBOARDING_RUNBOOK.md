# StayOS Pilot Hotel Onboarding Runbook

## 1. Property Setup Sequence

```
1. Create Hotel Property & Organization in Admin Portal
        │
2. Configure Room Inventory (Room Types, Pricing, Floor Numbers)
        │
3. Set Up Rate Plans, Meal Plans & GST Tax Configuration (5% F&B, 12%/18% Rooms)
        │
4. Provision Staff Users & Assign Department Job Roles
        │
5. Configure Department Stores & Kitchen Menu Catalog
        │
6. Install StayOS Operations Release APK on Staff Android Devices
        │
7. Staff Login with Assigned Role Credentials
        │
8. Launch Controlled Hotel Pilot
```

---

## 2. Staff User Profiles & Role Allocation

| Staff Account Role | Department | Permitted Workspaces | Restrictions Enforced |
| :--- | :--- | :--- | :--- |
| **HOTEL_ADMIN / MANAGER** | General Management | Full property dashboard, reports, approvals | Tenant-isolated to assigned property |
| **FRONT_DESK** | Front Office | Arrivals, Departures, Room Board, Folios | Cannot modify room base prices or approve cashier shortage |
| **CASHIER** | Front Office Cashier | Cashier Shifts, Payment Receipts, Safe Drops | Cannot self-approve shift shortage variance |
| **HOUSEKEEPING** | Housekeeping | Room Board, Turnover Tasks, Minibar | Cannot access guest financial statements or master invoices |
| **FNB_MANAGER / KITCHEN** | F&B & Culinary | Tables 1–12, Menu Catalog, Kitchen KDS | Cannot alter guest room tariffs or modify guest folios directly |
| **TECHNICIAN** | Engineering | Work Orders, Plant Maintenance, OOO Lock | Cannot check in guests or release OOO rooms directly to Clean |
| **STOREKEEPER** | Inventory & Stores | Requisitions, Stock Transfers, Warehouses | Cannot disburse cash or modify guest accounts |
| **ACCOUNTING** | Accounts & Finance | Invoices, Cashier Reconciliations, Reports | Cannot alter physical room statuses |
