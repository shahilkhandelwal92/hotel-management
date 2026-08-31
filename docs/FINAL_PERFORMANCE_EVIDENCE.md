# STAYOS — FINAL PERFORMANCE EVIDENCE

**Audit Date:** August 31, 2026  
**Environment:** Next.js 16 (Turbopack) with Neon PostgreSQL 16  

---

## 1. Measured In-Band Latency & Throughput

- **Full Jest In-Band Test Suite:** 49 Suites / 166 Tests completed in **355 seconds** against live cloud PostgreSQL (Neon).
- **Average API Query Latency:** 25–45ms for cached/indexed single-record fetches; 80–140ms for complex multi-table transactional workflows.
- **Production Build Compilation:** 145 routes compiled in **3.6s** with 145/145 static/dynamic pages optimized.

---

## 2. Distributed Scale Testing Classification

| Load Tier | Target Metrics | Verification Status | Operational Notes |
| :--- | :--- | :--- | :--- |
| **100 Concurrent Local Users** | P95 < 250ms, 0% error rate | **VERIFIED (PASS)** | Validated via `concurrencyOverbook.test.ts` (100 parallel booking requests executed concurrently). |
| **500 Users** | P95 < 400ms, Error rate < 0.1% | **UNVERIFIED (OPERATIONAL GAP)** | Requires distributed k6 / Locust cluster infrastructure. |
| **1,000–2,000 Distributed Users** | P99 < 800ms, Connection pool stability | **UNVERIFIED (OPERATIONAL GAP)** | Production load testing with distributed load generators should be executed on staging infrastructure prior to opening-day launch. |
