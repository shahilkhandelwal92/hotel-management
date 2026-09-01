# StayOS — Enterprise Security & Tenant Isolation Model

## 1. Multi-Tenant Architecture
* **Authoritative Server Resolution:** Tenant context resolved server-side via JWT claims in `resolveTenantContext()`.
* **Database Isolation:** All operational queries filter explicitly on authenticated `hotelId`.
* **Cross-Tenant Barrier:** Cross-tenant attempts are denied with `403 Forbidden` or safe `null` responses.

---

## 2. Authentication & Credential Storage
* **Dual Auth:** Bearer JWT headers (Android SecureStore) and HTTP-only SameSite cookies (Web PMS).
* **Hardware KeyStore:** Mobile tokens stored in hardware-backed Android KeyStore via `expo-secure-store`.
* **Immediate Revocation:** 401 Unauthorized responses wipe tokens locally and redirect to login.

---

## 3. RBAC & Permissions
* **Server-Side Authority:** Mutations require explicit permission checks via `requirePermission()`.
* **Client UI Protection:** `PermissionGate` provides UI convenience; server remains the authoritative gate.
* **Separation of Duties:** Cashier blind count variances require supervisor/manager approval; cashier self-approval is blocked.
