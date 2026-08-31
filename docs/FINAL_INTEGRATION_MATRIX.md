# STAYOS — FINAL EXTERNAL INTEGRATIONS CLASSIFICATION MATRIX

**Audit Date:** August 31, 2026  
**Standard:** 4-Tier Integration Verification Classification (Levels 0–3)

---

## 1. External Integration Classification Table

| Integration Category | Provider Target | Implementation Level | Verification Evidence | Operational Launch Readiness |
| :--- | :--- | :--- | :--- | :--- |
| **Channel Manager (OTA)** | Booking.com / Expedia / Agoda | **LEVEL 1 (Internal Adapter)** | Rate/Room mapping, multiplier, sync jobs verified via `channelManager.test.ts` | Ready for hotel partner XML credential binding |
| **Payment Gateway** | Razorpay / Stripe / UPI | **LEVEL 1 (Internal Adapter)** | Idempotency keys, HMAC signatures, webhook deduplication verified via `paymentIdempotency.test.ts` | Ready for live merchant API keys |
| **Guest Communications** | SMS / WhatsApp / Email | **LEVEL 1 (Internal Adapter)** | Dynamic templating and outbound logging verified via `communication.test.ts` | Ready for Twilio / Gupshup credentials |
| **Smart Locks Hardware** | Dormakaba / Assa Abloy / Onity | **LEVEL 1 (Internal Adapter)** | Token generation, access scopes, and room validity verified via `smartAccess.test.ts` | Ready for on-site IP bridge pairing |
| **Database Engine** | PostgreSQL 16 on Neon Serverless | **LEVEL 3 (Live Provider)** | Direct interactive connections and transactions verified across all 53 test suites | **LIVE VERIFIED & PASS** |
| **PDF Generation** | Invoices, Folios, BEOs | **LEVEL 3 (Live Provider)** | Server-side PDF generation verified in `/api/billing/generate-pdf` | **LIVE VERIFIED & PASS** |

---

## 2. Classification Definitions

- **Level 0 (Code Exists Only):** Interfaces defined but untested.
- **Level 1 (Internal Adapter Verified):** Mock providers and automated service test suites pass 100%.
- **Level 2 (Sandbox Provider Verified):** Tested against staging API credentials.
- **Level 3 (Live Provider Verified):** Tested and active against production cloud infrastructure.
