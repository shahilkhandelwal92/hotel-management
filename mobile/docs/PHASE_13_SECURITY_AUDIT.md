# StayOS Phase 13 — Security & Secrets Audit

## 1. Security Invariants
* **Hardware-Backed KeyStore:** Android JWT storage uses `expo-secure-store` backed by Android KeyStore.
* **Server-Side Tenant Isolation:** All queries filter on authenticated `hotelId` via `resolveTenantContext()`.
* **RBAC Enforcement:** Permission gates prevent privilege escalation across all administrative and operational endpoints.
* **Secrets Audit:** Mobile application bundle contains zero secrets, database URLs, or private keys; strictly exposes `EXPO_PUBLIC_API_URL`.
