# STAYOS — FINAL CONCURRENCY & RACE-CONDITION AUDIT

**Audit Date:** August 31, 2026  
**Target Database:** PostgreSQL 16 on Neon Serverless  

---

## 1. Concurrency Test Scenarios & Results

| Concurrency Scenario | Load / Race Condition | Mechanism | Result |
| :--- | :--- | :--- | :--- |
| **100-Way Room Overbooking** | 100 simultaneous booking requests for a single room | Atomic database `RoomBlock` exclusion constraints + Prisma serializable transactions | **0 Overbookings (PASS)** |
| **10-Way Simultaneous Payments** | 10 parallel identical payment submissions | Idempotency keys (`idempotencyKey` unique index) | **1 Succeeded, 9 Rejected / Idempotent (PASS)** |
| **Concurrent Cashier Closing** | Multiple closing requests for same active drawer | Atomic status check `status == 'OPEN'` inside transaction | **1 Closed, 0 Duplicate Records (PASS)** |
| **Concurrent Room Move** | 2 desk agents moving same guest simultaneously | Transactional row-level room locking | **Deterministic target room assignment (PASS)** |
| **Concurrent Loyalty Redemption** | Multiple parallel redemption requests | Account lock & points balance bounds check ($\ge 0$) | **No negative balances allowed (PASS)** |
| **Night Audit Concurrency** | Dual night audit triggers | Atomic `isAuditRunning` locking & day-lock constraints | **Exactly one business roll executed (PASS)** |

---

## 2. Verification Evidence

Verified through `src/__tests__/concurrencyOverbook.test.ts`, `src/__tests__/paymentIdempotency.test.ts`, `src/__tests__/roomBlocks.test.ts`, and `src/__tests__/deepAdversarialOperations.test.ts`.
