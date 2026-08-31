# STAYOS — FINAL CONCURRENCY EVIDENCE

**Audit Date:** August 31, 2026  
**Target Database:** PostgreSQL 16 on Neon Serverless  

---

## 1. Concurrency Results

| Race Condition Scenario | Concurrency Level | Mechanism | Result |
| :--- | :--- | :--- | :--- |
| **100-Way Room Overbooking** | 100 simultaneous bookings | Database `RoomBlock` exclusion constraints + serializable transactions | **0 Overbookings (PASS)** |
| **10-Way Simultaneous Payments** | 10 parallel identical payments | `idempotencyKey` unique database index | **1 Succeeded, 9 Deduplicated (PASS)** |
| **Concurrent Cashier Closing** | Multiple closing triggers | Atomic `status == 'OPEN'` conditional check inside transaction | **1 Closed, 0 Duplicate Records (PASS)** |
| **Concurrent Room Move** | 2 desk agents moving same guest | Row-level room locking | **Deterministic target room assignment (PASS)** |
| **Concurrent Loyalty Redemption** | Multiple parallel redemption requests | Account lock & points balance bounds check ($\ge 0$) | **No negative balances allowed (PASS)** |
| **Night Audit Concurrency** | Dual night audit triggers | Atomic `isAuditRunning` locking & day-lock constraints | **Exactly one business roll executed (PASS)** |
