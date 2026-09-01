# StayOS Phase 9 — Pre-Pilot Forensic Audit

## 1. Executive Summary
This audit validates the integrity of the StayOS Hotel Management Platform prior to final production certification.

* **Branch:** `feature/stayos-android`
* **Starting Commit:** `e65e4aa457007740f90cb06d5c6ec9bf154eec2d`
* **Working Tree:** Clean (0 uncommitted files)

---

## 2. Phase 1–8 Forensic Summary & Evidence State

| Phase | Milestone Name | Key Deliverables & Verified Proofs |
| :--- | :--- | :--- |
| **Phase 1** | Mobile Bearer JWT Authentication | Dual-mode authentication (HTTP-only cookies & Bearer JWT) in `getSession()`, multi-tenant database session loading, zero secrets in client. |
| **Phase 2** | Expo Foundation & Housekeeping | Expo Router v4, TanStack Query, Room Board, cleaning progression, minibar replenishment, Lost & Found. |
| **Phase 3** | Front Desk & Folio Operations | Arrivals/Departures search, walk-in creation, atomic room check-in, in-stay room move, 4-window split folios, zero-balance checkout. |
| **Phase 4** | Cashiering & Restaurant POS / KDS | Cash drawer shifts, opening float, blind count close, variance escalation, 12-table dining grid, KOT kitchen queue. |
| **Phase 5** | Engineering & Multi-Store Inventory | Plant asset catalog, work orders, Out-of-Order room isolation, multi-store requisitions, dispatch transit, receiving. |
| **Phase 6** | Production Release Hardening | Application ID `com.stayos.operations` (v1.0.1, VersionCode 2), dynamic HTTPS API URL with fail-safe, 2.96 MB Hermes bundle. |
| **Phase 7** | Controlled Pilot Simulation | Full 24-hour business day simulated on production schema (10/10 tests PASS), Night Audit rollover and day lock. |
| **Phase 8** | Commercial Integrations & Failure Modes | Webhook idempotency, smart lock lifecycle, cashier variance manager enforcement, physical Android 12 & 14 device acceptance. |

---

## 3. Authoritative Architectural Invariants
1. **Server Single Source of Truth:** All financial calculations, room state machines, inventory conservation, RBAC, and multi-tenant isolation remain 100% server-authoritative.
2. **Client Presentation Layer:** The mobile application (`com.stayos.operations`) operates strictly as a secure client presentation layer.
3. **Exact Decimal Safety:** All monetary figures use `Prisma.Decimal(18, 2)` to eliminate floating-point drift.
4. **KeyStore Hardware Security:** JWT session tokens are stored exclusively in hardware KeyStore via `expo-secure-store`.
