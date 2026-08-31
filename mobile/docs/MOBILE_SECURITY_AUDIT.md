# StayOS Mobile Security & RBAC Audit

## 1. Executive Summary
This document records the security boundaries, credential lifecycles, and tenant isolation guarantees enforced between the StayOS Operations Android application and the StayOS API cluster.

---

## 2. Threat Analysis & Mitigations

| Threat Vector | Risk Level | Mitigation Strategy | Enforcement Layer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Token Theft / Extraction** | HIGH | Credentials stored exclusively in `Expo SecureStore` (Android KeyStore AES-256 encrypted SharedPreferences). | Client hardware | **PASS** |
| **Cross-Tenant Access** | CRITICAL | Staff `hotelId` is authoritatively resolved from PostgreSQL via `resolveTenantContext(req)`. Client query tampering is rejected with 403. | Server API | **PASS** |
| **Privilege Escalation** | CRITICAL | UI `PermissionGate` is purely for visual UX. Server `requirePermission()` validates dynamic DB permissions per request. | Server API | **PASS** |
| **Stale Session Abuse** | MEDIUM | 401 response from backend triggers immediate SecureStore purge and redirects user to login. | Client API Client | **PASS** |
| **Accidental Operations** | MEDIUM | Critical turnover completions require visual `ConfirmDialog` before mutation. | Client UX | **PASS** |
| **Secret Exposure in APK** | CRITICAL | 0 database URLs, signing keys, or merchant credentials are included in mobile bundle. Verified via `npx expo export`. | Build Engine | **PASS** |

---

## 3. Audited Invariants
1. `POST /api/auth/login` validates credentials against bcrypt hash and returns minimal token.
2. `GET /api/auth/me` returns authoritative user identity, active hotel property, and dynamic RBAC permissions list.
3. Passwords are wiped from React state immediately upon login success.
4. No plain text token logging in `client.ts` or `AuthContext.tsx`.
