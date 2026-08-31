# STAYOS — FINAL DATABASE INTEGRITY & FORENSICS AUDIT

**Audit Date:** August 31, 2026  
**Database:** PostgreSQL 16 on Neon Serverless  
**ORM:** Prisma 6.4.1  

---

## 1. Relational Integrity & Orphan Prevention Forensics

| Model / Table | Cascade / Relational Rules | Tenant Foreign Key | Unique Constraints | Audit Result |
| :--- | :--- | :--- | :--- | :--- |
| **Folio / FolioTransaction** | `Folio` `onDelete: Cascade` to `Hotel`; `FolioTransaction` `onDelete: Cascade` to `Folio` | `hotelId` indexed | `@@index([folioId])` | **PASS (No orphans)** |
| **Room / RoomBlock** | `RoomBlock` `onDelete: Cascade` to `Room` | `hotelId` indexed | `@@index([roomId, startDate, endDate])` | **PASS (Atomic locking)** |
| **Invoice / InvoiceItem** | `InvoiceItem` `onDelete: Cascade` to `Invoice` | `hotelId` indexed | `@@unique([hotelId, invoiceNumber])` | **PASS (Gapless sequence)** |
| **CashierShift / DrawerTxn** | `CashDrawerTransaction` `onDelete: Cascade` to `CashierShift` | `hotelId` indexed | `@@index([shiftId, type])` | **PASS (Conserved balance)** |
| **AR / ARAccount / ARInvoice** | `ARInvoice` `onDelete: Cascade` to `ARAccount` | `hotelId` indexed | `@@unique([hotelId, invoiceNumber])` | **PASS (Credit limit guard)** |
| **AP / VendorAccount / APInvoice**| `APInvoice` `onDelete: Cascade` to `VendorAccount` | `hotelId` indexed | `@@unique([hotelId, invoiceNumber])` | **PASS (3-way match)** |
| **MaintenanceAsset / WorkOrder**| `WorkOrder` `onDelete: SetNull` to `MaintenanceAsset` | `hotelId` indexed | `@@unique([hotelId, workOrderNumber])`| **PASS (SLA trace)** |
| **Stores / StockTransfer** | `StockTransfer` `onDelete: Cascade` to `InventoryStore` | `hotelId` indexed | `@@unique([hotelId, transferNumber])` | **PASS (Balance neutral)** |
| **LinenItem / MinibarItem** | `MinibarConsumption` `onDelete: Cascade` to `MinibarItem` | `hotelId` indexed | `@@unique([hotelId, code])` | **PASS (Folio linked)** |

---

## 2. Antipattern Forensics Checklist

- [x] **No Unsafe `count() + 1` Sequences:** Sequence generation uses atomic row updates in `invoiceSequence.ts`.
- [x] **Zero Floating-Point Monetary Types:** Zero `Float` fields in database schema for financial balances; all are `Decimal @db.Decimal(18, 2)` or `(18, 4)`.
- [x] **No Client-Supplied Tenant Mutations:** All mutations pull `hotelId` strictly from authenticated session claims in `resolveTenantContext`.
- [x] **No Missing Database Transactions:** All multi-step mutations execute inside `prisma.$transaction(async (tx) => { ... }, { maxWait: 15000, timeout: 30000 })`.
