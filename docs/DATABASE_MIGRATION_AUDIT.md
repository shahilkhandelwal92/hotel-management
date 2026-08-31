# StayOS — Database Migration Safety & Schema Evolution Audit

**Document Reference**: `docs/DATABASE_MIGRATION_AUDIT.md`  
**Generated Date**: August 31, 2026  
**Audited Engine**: Prisma ORM, PostgreSQL 16, Neon Serverless  

---

## 1. Schema Safety & Migration Strategy

Database schema changes in a multi-tenant PMS handling live hotel folios and reservations must never cause table locks, data truncation, or unrecoverable state.

### Standardized Schema Verification Pipeline:
```
Current Production Schema
           │
           ▼
[Migration Forward Test] ──> [Schema Validation] ──> [Data & Type Validation]
           │
           ▼
[Backward Compatibility Verification] ──> [Index Build & Lock Assessment]
           │
           ▼
[Forward-Fix & Backup Restore Strategy]
```

---

## 2. Model & Index Optimization Matrix

| Model | Primary Key | Unique Constraints | Multi-Tenant Index | Foreign Key Cascade Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `Hotel` | `id` (UUID) | None | Primary Tenant Root | Cascade delete to child property entities |
| `Room` | `id` (UUID) | `@@unique([hotelId, number])` | `hotelId` | Restrict deletion if active `RoomBlock` exists |
| `RoomBlock` | `id` (UUID) | `@@unique([roomId, date])` | `hotelId`, `reservationId` | Cascade delete on reservation cancellation |
| `Reservation` | `id` (UUID) | `bookingRef` | `hotelId`, `roomId` | Cascade delete blocked if `CheckedIn` |
| `Folio` | `id` (UUID) | `reservationId` | `reservationId` | Restrict delete on closed folios |
| `FolioTransaction`| `id` (UUID) | None | `folioId`, `nightAuditId` | Immutable ledger transactions |
| `Invoice` | `id` (UUID) | `invoiceNumber` | `hotelId`, `reservationId` | Immutable financial record |
| `GroceryStockMovement` | `id` (UUID) | None | `stockId` | Immutable stock audit log |
| `TaxConfiguration`| `id` (UUID) | `@@unique([hotelId, financialYear])` | `hotelId` | One config per property per fiscal year |

---

## 3. Decimal Precision & Column Type Validation

All financial columns in `prisma/schema.prisma` are strictly mapped to `Decimal @db.Decimal(18, 2)`:
- `Room.basePrice`: `Decimal(18, 2)`
- `Reservation.baseAmount`, `totalAmount`, `advanceDeposit`, `balanceDue`: `Decimal(18, 2)`
- `Folio.balance`: `Decimal(18, 2)`
- `FolioTransaction.amount`: `Decimal(18, 2)`
- `Invoice.subtotal`, `grandTotal`, `cgst`, `sgst`, `igst`, `roundOff`: `Decimal(18, 2)`
- `Payment.amount`: `Decimal(18, 2)`
- `EmployeeSalary.basicSalary`, `allowances`, `deductions`, `netSalary`: `Decimal(18, 2)`
- `PayrollRecord.netSalary`, `pfDeduction`, `esiDeduction`, `ptDeduction`, `tdsDeduction`: `Decimal(18, 2)`

---

## 4. Forward-Fix & Backup Restore Strategy

Because PostgreSQL migrations may alter column nullability or foreign keys that cannot be cleanly undone with simple down scripts without data loss:
1. **Zero-Downtime Additive Migrations**: New columns are created as nullable or with safe defaults.
2. **Dual-Read / Dual-Write Phase**: Deploy application supporting old and new structures before dropping columns.
3. **Backup Point-in-Time Restore**: In the event of catastrophic data corruption, execute single-tenant or full-database point-in-time recovery from continuous WAL archives.
