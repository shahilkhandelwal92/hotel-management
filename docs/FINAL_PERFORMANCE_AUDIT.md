# STAYOS — FINAL PERFORMANCE & LOAD CAPACITY AUDIT

**Audit Date:** August 31, 2026  
**Test Harness:** In-Band Jest Execution + Concurrency Stress Drivers against live Neon PostgreSQL  

---

## 1. Measured Performance Results

| Performance Metric | Measured Value | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **In-Band Test Suite Execution (53 Suites / 177 Tests)** | **355–380 seconds** | Full test runner against live Neon Cloud DB | **PASS** |
| **Average Single-Record Read Latency** | **20–40ms** | Indexed queries (`id`, `hotelId`, `reservationId`) | **PASS** |
| **Complex Transaction Latency (Room Move, 3-Way Match)** | **70–140ms** | Multi-table interactive transactions | **PASS** |
| **100 Concurrent Local Booking Race Requests** | **0 Overbookings** | `concurrencyOverbook.test.ts` | **PASS** |
| **10 Concurrent Identical Payment Submissions** | **1 Succeeded, 9 Deduplicated** | `paymentIdempotency.test.ts` | **PASS** |
| **Production Build Optimization (145 Routes)** | **3.6 seconds** | Turbopack compilation | **PASS** |

---

## 2. Distributed Scale Load Testing Status

- **500–2,000 Concurrent User Distributed Cluster Load:** **UNVERIFIED (OPERATIONAL GAP)**. Requires multi-node k6 / Locust cluster infrastructure.
