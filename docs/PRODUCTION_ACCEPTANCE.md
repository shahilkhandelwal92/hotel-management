# StayOS Production Acceptance & Verification Matrix

## 1. Evidence Level Classification

```text
LEVEL 0 — ABSENT
LEVEL 1 — CODE IMPLEMENTED
LEVEL 2 — AUTOMATED TESTED
LEVEL 3 — UI / DEVICE VERIFIED
LEVEL 4 — REAL PRODUCTION / EXTERNAL PROVIDER VERIFIED
```

---

## 2. Capability Verification Matrix

| Module / Operation | Evidence Source | Invariants Enforced | Classification |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | Bearer JWT / KeyStore | Server-authoritative role check | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Multi-Tenancy** | `resolveTenantContext` | 403 rejection on cross-hotel access | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Housekeeping & Turnover** | Room Board & Tasks | Dirty $\rightarrow$ Cleaning $\rightarrow$ Clean $\rightarrow$ Inspected | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Front Desk Check-In** | Folio & Reservations | Atomic room occupancy lock | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Room Move** | In-Stay Relocation | Atomic old room Dirty, new room Occupied | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Split Folios (1–4)** | Window 1–4 Transfers | Exact Decimal conservation | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Zero-Balance Checkout** | Folio Settlement | Checkout blocked if balance > 0 | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Cashier Shifts** | Float & Blind Count | Variance escalation to management | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Restaurant POS & KDS** | Tables 1–12 & KOT | Real-time queue age & stock deduction | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Engineering & OOO Lock** | Maintenance Engine | Room status set to Maintenance, blocked | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Stores & Stock Transfers**| Stores Engine | Source decrement == Destination increment| **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Night Audit** | Day Closure | Day lock immutability, date rollover | **LEVEL 3 — UI / DEVICE VERIFIED** |
| **Payment Gateway (Live)** | Razorpay / Stripe | Live merchant credentials required | **UNVERIFIED (Onboarding Dependency)** |
| **Channel Manager (Live)** | OTA Bridge | Live OTA distributor credentials | **UNVERIFIED (Onboarding Dependency)** |
| **Smart Lock (Live)** | TTLock / Salto | Live hardware gateway bridge required | **UNVERIFIED (Onboarding Dependency)** |
