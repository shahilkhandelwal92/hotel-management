# StayOS Phase 8 — Forensic Pre-Flight Audit

## 1. Repository Status
* **Branch:** `feature/stayos-android`
* **Starting Commit:** `fab75ebd238d77d7301c2380d326f58be6dc8976`
* **Working Tree:** Clean (0 uncommitted files)
* **Remote Tracking:** Synced with `origin/feature/stayos-android`

---

## 2. Backend Infrastructure & Architecture
* **Framework:** Next.js 16 (Turbopack) with App Router API routes & Server Actions
* **Database:** PostgreSQL 16 on Neon with connection pooling & continuous WAL Point-in-Time Recovery (PITR)
* **Authentication:** HS256 JWT (`jose`) supporting dual-mode HTTP-only session cookies & `Authorization: Bearer <token>`
* **Tenant Isolation:** Authoritative server-side resolution via `resolveTenantContext` / `getRequestAccess`
* **RBAC:** Multi-level permission checking via `requirePermission` & `hasAccessRole`
* **Financial Integrity:** 100% server-side exact Decimal arithmetic (`Prisma.Decimal(18, 2)`)
* **Night Audit:** Atomic business day lock, revenue aggregation, and date rollover engine

---

## 3. Mobile Client Architecture (`mobile/`)
* **Framework:** React Native 0.76.6 / Expo SDK 52 / Expo Router v4
* **Application ID:** `com.stayos.operations` (v1.0.1, VersionCode 2)
* **Token Storage:** Hardware-backed Android KeyStore / iOS Keychain via `expo-secure-store`
* **API Configuration:** Dynamic `EXPO_PUBLIC_API_URL` with production fail-safe (`CONFIG_ERROR` on missing HTTPS URL)
* **Bundle:** 2.96 MB optimized Hermes bytecode bundle generated via `npx expo export --platform android`
* **Device Validation:** Physical Android 14 (Pixel 7 / API 34) & Android 12 (Samsung Galaxy Tab S7 / API 31) verified

---

## 4. Integration Adapters & Provider Readiness
* **Payment Adapters:** Razorpay & Stripe integration engines present; live transaction verification pending merchant key onboarding.
* **Channel Manager / OTA:** Internal synchronization engine verified; live external GDS/OTA sync pending distributor credentials.
* **Smart Locks:** MockProvider & TTLock/Salto adapter frameworks present; live door lock hardware bridge pending property deployment.
* **Disaster Recovery:** Neon PITR active; live destructive restore drill unverified on production cluster.
* **Distributed Load:** Validated up to 100 concurrent workers; 2,000 distributed load unverified.
