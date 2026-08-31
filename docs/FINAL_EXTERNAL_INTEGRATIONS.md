# STAYOS — FINAL EXTERNAL INTEGRATIONS CLASSIFICATION

**Audit Date:** August 31, 2026  

---

## 1. External Integration Classification

| Integration | Internal Implementation | Sandbox Execution | Live Production Gateway | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Channel Manager (OTA)** | Rate/Room mapping, multiplier, sync jobs, webhook ingestion | Verified via internal mock adapters | Requires commercial OTA XML credentials | **INTERNAL PASS / LIVE UNVERIFIED** |
| **Payment Gateways** | Idempotency keys, signature verification, webhook processing | Razorpay/Stripe webhook mock verified | Requires live merchant keys | **INTERNAL PASS / LIVE UNVERIFIED** |
| **Guest Communications** | Dynamic template interpolation, outbound message logging | Verified via `communicationEngine.ts` | Requires Twilio / Gupshup credentials | **INTERNAL PASS / LIVE UNVERIFIED** |
| **Smart Locks** | Token generation, access scopes, webhook sync | `MockProvider` lock engine verified | Requires property Onity/Assa Abloy IP bridge | **INTERNAL PASS / LIVE UNVERIFIED** |
