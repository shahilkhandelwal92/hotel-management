# StayOS — Real Hotel End-to-End Operational Flows

**Document Reference**: `docs/REAL_HOTEL_E2E_FLOWS.md`  
**Generated Date**: August 31, 2026  
**Audited Persona Workflows**: Front Desk, Housekeeping, F&B, HR, Accounting, Corporate, Guest  

---

## 1. Front Desk & Guest Stay Workflow (24-Hour Lifecycle)

```
[Guest Search / Walk-in]
           │
           ▼
[Dynamic Rate Plan Selection] ──> [Atomic RoomBlock Locking] ──> [Open Guest Folio]
                                                                          │
[Check-In Timestamp & Room Occupied] <── [Verify ID & Deposit] <──────────┘
           │
           ├─► [Smart Key Issued (RoomOnly)]
           ├─► [In-Stay Dining Orders] ────► [Posted to Active Folio]
           ├─► [Amenity Reservations] ────► [Posted to Active Folio]
           ├─► [Night Audit Room Tariff] ──► [Posted to Active Folio]
           │
           ▼
[Guest Settlement (UPI / Card / Cash)] ──> [Folio Balance = 0.00]
           │
           ▼
[Checkout Completed] ──> [Room Status = Dirty] ──> [Auto-Generate Housekeeping Task]
                     ──> [Smart Key Instantly Revoked]
                     ──> [Consecutive GST Invoice Issued]
```

---

## 2. Housekeeping & Maintenance Reality Flows

### A. Checkout Turnover
1. Front Desk executes checkout.
2. System automatically sets `Room.status = "Dirty"`.
3. System creates a `HousekeepingTask` with high priority and default checklist items:
   - Change bed sheets
   - Clean bathroom & replenish toiletries
   - Vacuum & disinfect floor
   - Restock minibar
4. Housekeeper starts task -> `status = "InProgress"`, `Room.status = "Cleaning"`.
5. Supervisor inspects -> `status = "Completed"`, `Room.status = "Vacant"` (or `Available`).

### B. Maintenance Takeover
1. Housekeeper or guest reports defect (e.g. AC cooling, lock battery low).
2. Workorder logged -> `Room.status = "Maintenance"`.
3. Reservation engine strictly blocks room from new bookings or allocations (HTTP 409 Conflict).
4. Technician completes repair -> Supervisor inspects -> `Room.status = "Dirty"` -> Cleaned -> `Room.status = "Vacant"`.

---

## 3. F&B, Kitchen KDS & Inventory Costing Flow

1. Waiter / Guest orders via POS / Guest Portal (Table 4 or Room 204).
2. POS Order created (`Pending`).
3. Atomic transaction inspects `RecipeIngredient` quantities against `GroceryStock`:
   - If stock is insufficient -> Order rejected with HTTP 409 Conflict.
   - If stock is sufficient -> Deducts `quantityOrdered * recipeQuantity` and records `GroceryStockMovement` (OUT).
4. KOT generated in Kitchen Display System (KDS).
5. Kitchen marks `Preparing` -> `Ready` -> `Delivered`.
6. Bill settled immediately or charged to room folio.

---

## 4. Corporate Events & Banquet Workflow

1. Corporate planner selects venue, dates, package, and pax count.
2. Capacity validation ensures `pax <= venue.capacity`.
3. Banquet Event Order (BEO) generated with itemized venue rental, decor, and per-pax catering.
4. Corporate planner uploads attendee CSV roster.
5. System validates CSV rows, deduplicates emails/mobiles, and issues cryptographic QR passes.
6. Event day: Reception scans QR pass with mobile scanner:
   - Valid QR -> Mark attendee checked-in, increment attendee counter.
   - Duplicate scan -> Controlled rejection ("Already checked in at 18:14").
   - Cross-event / expired scan -> Controlled 404/403 rejection.

---

## 5. HR, Geofenced Attendance & Statutory Payroll Flow

1. Staff member opens Attendance scanner on mobile device within hotel premises.
2. Device transmits GPS coordinates (`latitude`, `longitude`).
3. Server executes Haversine formula against `Hotel.latitude`, `Hotel.longitude`, and `Hotel.geofenceRadius`:
   - Inside boundary ($\le \text{radius}$) -> Attendance marked `Present`.
   - Outside boundary ($> \text{radius}$) -> Check-in rejected (HTTP 403 Forbidden).
4. Month-end: HR reviews total present days, approved leaves, and Loss of Pay (LOP).
5. Payroll Engine computes exact Decimals:
   - Basic Salary + Allowances - PF (12%) - ESI (0.75%) - Professional Tax (PT) - TDS (Sec 192B) - LOP = Net Salary.
6. HR approves payroll -> Generates immutable payslips.
