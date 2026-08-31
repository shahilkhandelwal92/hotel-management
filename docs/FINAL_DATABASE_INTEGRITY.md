# STAYOS — FINAL DATABASE INTEGRITY & FORENSICS

**Audit Date:** August 31, 2026  
**Database:** PostgreSQL 16 on Neon Serverless  
**ORM:** Prisma 6.4.1  

---

## 1. Relational Integrity Checklist

- [x] **Zero Orphan Records:** All child items (FolioTransactions, Payments, InvoiceItems, TaskComments, DrawerTransactions) use cascade deletions or foreign key constraints.
- [x] **Strict Decimal Money:** Zero `Float` fields in database schema for monetary values; all use `@db.Decimal(18, 2)`.
- [x] **Gapless Sequence Integrity:** Sequence generation uses atomic row locking in `invoiceSequence.ts`.
- [x] **No Unhandled Concurrent Mutations:** All multi-step database mutations execute inside `prisma.$transaction(async (tx) => { ... }, { maxWait: 15000, timeout: 30000 })`.
