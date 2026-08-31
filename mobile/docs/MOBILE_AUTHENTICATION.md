# StayOS Mobile Authentication Architecture & Security Specification

## 1. Overview
StayOS employs a unified, dual-channel authentication architecture designed to seamlessly serve both the Next.js web application and the StayOS Android Operations mobile application without code duplication or security compromises.

```
┌───────────────────────────────────────────────┐
│              STAYOS AUTHENTICATION            │
└───────────────────────┬───────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
 [Web Application]            [Android Mobile App]
Cookie: session=<jwt>        Authorization: Bearer <jwt>
 (HTTP-Only, SameSite=Lax)    (Stored in Expo SecureStore)
        │                               │
        └───────────────┬───────────────┘
                        ▼
                src/lib/auth.ts
                getSession()
                        │
                        ▼
             Server-Side Verification
               (HS256 Jose Verify)
                        │
                        ▼
             Authoritative DB Context
           getAuthoritativeUserContext()
           - Active User & Account Status
           - Tenant Scope (hotelId)
           - Dynamic RBAC Permissions
```

---

## 2. Token Specifications & Lifecycles
* **Algorithm:** HMAC-SHA256 (`HS256`) via `jose`.
* **Signing Secret:** `JWT_SECRET` environment variable ($\ge 32$ characters in production).
* **Token Lifetime:** 24 Hours (`maxAge: 86400`).
* **Signed Claims Payload:**
  ```json
  {
    "id": "usr_cly123456789",
    "email": "frontdesk@hotel.com",
    "name": "Front Desk Agent",
    "hotelId": "htl_grandpalace",
    "roles": ["FRONT_DESK"],
    "iat": 1756684800,
    "exp": 1756771200
  }
  ```
* **Payload Safety Boundary:**
  - Zero sensitive secrets (no DB URLs, no Stripe/Razorpay keys, no OTA credentials).
  - Contains strictly minimal identifiers required for cryptographic identity matching.

---

## 3. Server-Side Precedence & Resolution
`getSession()` evaluates credentials deterministically:
1. **HTTP-only Cookie (`session`):** Checked first to preserve standard Next.js browser authentication.
2. **Bearer Token Header (`Authorization: Bearer <token>`):** Checked if session cookie is absent (standard mobile API flow).
3. **Absence or Cryptographic Invalidation:** Returns `null` (401 UNAUTHENTICATED).

### Authoritative Database Hydration
The server **never** trusts client-provided or token-cached permissions blindly. On every protected request:
* `resolveTenantContext(req)` verifies user existence and active status in PostgreSQL.
* Standard staff are locked to their DB-assigned `hotelId`.
* Permissions are resolved dynamically from `UserRole` $\rightarrow$ `Role` $\rightarrow$ `RolePermission` relations.

---

## 4. Mobile Storage Strategy
* **Storage Provider:** `Expo SecureStore` (hardware-backed Android Keystore / KeyStore encrypted SharedPreferences).
* **Prohibited Storage:** `AsyncStorage` is **strictly forbidden** for tokens, passwords, or personal guest data.
* **Token Invalidation on 401:** If the API client receives a `401 Unauthorized` or `403 User Disabled`, it immediately purges the credential from `SecureStore` and routes the user to the login screen.

---

## 5. Security Gates & Test Lineage
Verified in `src/__tests__/mobileAuth.test.ts`:
* [x] Web cookie authentication (`PASS`)
* [x] Android Bearer token authentication (`PASS`)
* [x] Deterministic precedence (Cookie over Bearer) (`PASS`)
* [x] Rejection of missing credentials with 401 (`PASS`)
* [x] Rejection of malformed tokens (`PASS`)
* [x] Rejection of tokens signed with incorrect keys (`PASS`)
* [x] Rejection of expired tokens (`PASS`)
* [x] Rejection of deleted / disabled users (`PASS`)
* [x] Cross-tenant boundary enforcement via Bearer token (`PASS`)
* [x] RBAC permission denial via Bearer token (`PASS`)
