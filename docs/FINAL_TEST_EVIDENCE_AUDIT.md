# STAYOS — FINAL TEST EVIDENCE AUDIT & CLASSIFICATION

**Audit Date:** August 31, 2026  
**Repository:** `shahilkhandelwal92/hotel-management`  
**Execution Environment:** Node 20+, Next.js 16 (Turbopack), PostgreSQL 16 (Neon Serverless)

---

## 1. Test Classification Matrix (49 Suites / 166 Tests)

Every test in StayOS is audited and classified into its true verification category to prevent false-pass reporting.

| Test Suite File | Category | Live PostgreSQL DB | Real Concurrency | Mock Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| `virtualHotelDaySimulation.test.ts` | **SIMULATION + DB INTEGRATION** | **YES (Neon)** | In-Band Sequential | None |
| `deepAdversarialOperations.test.ts` | **SECURITY + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `enterpriseAdversarial.test.ts` | **SECURITY + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `concurrencyOverbook.test.ts` | **REAL CONCURRENCY + DB** | **YES (Neon)** | **YES (100-Way Parallel)** | None |
| `paymentIdempotency.test.ts` | **REAL CONCURRENCY + DB** | **YES (Neon)** | **YES (10-Way Parallel)** | None |
| `roomBlocks.test.ts` | **REAL CONCURRENCY + DB** | **YES (Neon)** | **YES** | None |
| `approvalEngine.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `taskEngine.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `outboxEngine.test.ts` | **DATABASE INTEGRATION + CRYPTO** | **YES (Neon)** | Low | None |
| `splitFolio.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `depositLifecycle.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `noShow.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `roomMove.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `groupBlock.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `waitlist.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `cashierShift.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `arLedger.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `apThreeWayMatch.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `maintenance.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `storeTransfers.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `linenMinibar.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `channelManager.test.ts` | **DATABASE INTEGRATION (Internal)** | **YES (Neon)** | Low | External OTA Sandbox Unverified |
| `crmContracts.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `communication.test.ts` | **DATABASE INTEGRATION + UNIT** | **YES (Neon)** | Low | SMS/WhatsApp Gateway Mocked |
| `loyaltyLedger.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `reputation.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `rateRestrictions.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `multiCurrency.test.ts` | **DATABASE INTEGRATION + UNIT** | **YES (Neon)** | Low | None |
| `dashboardAnalytics.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `auth.test.ts` | **SECURITY + UNIT** | Memory / Crypto | None | None |
| `permissionAuth.test.ts` | **SECURITY + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `tenantGuard.test.ts` | **SECURITY + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `apiAccess.test.ts` | **SECURITY + API INTEGRATION** | **YES (Neon)** | Low | None |
| `portalAuth.test.ts` | **SECURITY + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `decimalMoney.test.ts` | **FINANCIAL UNIT** | Memory / Prisma.Decimal | None | None |
| `invoiceSequence.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | **YES (Atomic Row Locks)** | None |
| `invoice.test.ts` | **FINANCIAL + GST UNIT** | Memory / Prisma.Decimal | None | None |
| `domainPricing.test.ts` | **FINANCIAL UNIT** | Memory / Prisma.Decimal | None | None |
| `financialLedger.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `financialReports.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `nightAudit.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `timezone.test.ts` | **UNIT / TIMEZONE** | Memory / Intl | None | None |
| `smartAccess.test.ts` | **INTEGRATION** | **YES (Neon)** | Low | MockProvider Key Hardware |
| `stockMovement.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `payroll.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `ratePlans.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `folio.test.ts` | **DATABASE INTEGRATION** | **YES (Neon)** | Low | None |
| `integrationLifecycle.test.ts`| **API + DB INTEGRATION** | **YES (Neon)** | Low | None |
| `e2eSmoke.test.ts` | **API SMOKE INTEGRATION** | **YES (Neon)** | Low | None |

---

## 2. Evidence Audit Conclusions

1. **Database-Backing:** 44 of 49 test suites execute direct CRUD and transactional queries against real PostgreSQL on Neon.
2. **Zero Mock Money Calculations:** All financial unit tests verify `Prisma.Decimal` arithmetic natively without floating-point approximations.
3. **Transparent External Stubs:** External Smart Lock hardware (Dormakaba/Assa Abloy) and OTA partner XML APIs (Booking.com/Expedia live gateways) use internal service adapters and are transparently recorded as **UNVERIFIED for live hardware/gateway production environments**.
