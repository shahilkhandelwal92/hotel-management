# StayOS Android — Phase 6 Production Release Candidate Specification

## 1. Executive Summary
StayOS Operations Android Application (`com.stayos.operations`) Version `1.0.1` (Version Code `2`) is verified and hardened as a Production Release Candidate for controlled hotel pilot deployment.

---

## 2. Release Engineering Specifications
* **Application ID:** `com.stayos.operations`
* **Version Name:** `1.0.1`
* **Version Code:** `2`
* **Target OS:** Android 11+ (API 30+)
* **Runtime Engine:** Hermes Bytecode Engine (React Native 0.76.6 / Expo SDK 52)
* **Bundle Size:** 2.96 MB (optimized production bytecode)
* **State Management:** TanStack Query v5 with optimistic mutation rollback & pull-to-refresh
* **Secure Storage:** Android KeyStore backed `expo-secure-store` for JWT session tokens

---

## 3. Core Operational Modules Verified

| Module | Purpose & Scope | Verification Status |
| :--- | :--- | :--- |
| **Authentication** | Bearer JWT with automatic 401 purge and SecureStore persistence | **PASS** |
| **Housekeeping** | Room board, turnover progression, cleaning checklists, Lost & Found | **PASS** |
| **Front Desk** | Search/filter, walk-ins, room allocation, check-in, deposit collection, room move | **PASS** |
| **Folio & Billing** | 4-window split folios, payments, charge adjustments, zero-balance checkout | **PASS** |
| **Cashier Operations**| Shifts, opening float, cash drops, paid-outs, blind count close & variance | **PASS** |
| **Restaurant POS** | 12-table floor grid, category filters, KOT dispatch, room folio charging | **PASS** |
| **Kitchen KDS** | Live order queue (Pending $\rightarrow$ Preparing $\rightarrow$ Ready), grocery inventory | **PASS** |
| **Engineering** | Corrective work orders, plant machinery, parts used, OOO room isolation | **PASS** |
| **Stores & Inventory**| Multi-store requisitions, dispatch transit, receiving & stock counts | **PASS** |
