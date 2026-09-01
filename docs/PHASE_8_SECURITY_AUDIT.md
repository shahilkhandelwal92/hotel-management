# StayOS Phase 8 Enterprise Security Audit

## 1. Multi-Tenant Isolation & IDOR Protection
* Every query resolving `hotelId`, `reservationId`, `folioId`, `roomId`, or `storeId` strictly validates tenant tenancy server-side.
* Tampered request parameters attempting to read or mutate another property's records return `403 Forbidden` or `404 Not Found`.

---

## 2. Token Security & KeyStore Management
* Tokens are issued with server HS256 JWT signatures.
* Stored exclusively in hardware-backed Android KeyStore via `expo-secure-store`.
* Instant purge of credentials upon any `401 Unauthorized` response.
* Mobile client source code contains 0 private database URLs, server passwords, or gateway secret keys.
