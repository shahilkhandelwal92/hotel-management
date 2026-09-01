# StayOS Android Security & Invariants Release Audit

## 1. Multi-Tenant Isolation
* All mobile API calls authenticate via Bearer JWT.
* The server resolves tenant context (`hotelId`, `userId`, `isSuperAdmin`) strictly from the server-signed JWT and database session.
* Attempts to alter hotel ID via query params, URL tampering, or request payloads are rejected by the server with `403 Forbidden`.

---

## 2. Token Security & Storage
* **Android KeyStore:** Tokens are stored exclusively in hardware-backed KeyStore via `expo-secure-store`.
* **Zero Logging:** JWT tokens, user passwords, and credit card / PAN information are never logged.
* **Immediate 401 Purge:** Any `401 Unauthorized` API response immediately wipes the stored token and resets navigation state to Login.

---

## 3. Financial Invariants
* All decimal calculations (taxes, room service GST, cashier float reconciliations, folio charges) remain 100% server-authoritative.
* Client renders numbers safely using `MoneyDisplay` with formatted Indian Rupee (₹) currency notation.
