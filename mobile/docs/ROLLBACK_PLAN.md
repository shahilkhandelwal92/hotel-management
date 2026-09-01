# StayOS Android Controlled Pilot Rollback & Contingency Plan

## 1. Trigger Criteria for Rollback
* Unrecoverable crash on supported Android OS versions (Android 11–14).
* Inability to authenticate or restore KeyStore session.
* Discrepancy in server-side financial reconciliation.

---

## 2. Rollback Procedures

### Android Application Rollback
1. Keep the previous stable APK (`StayOS-Operations-v1.0.0.apk`) in the controlled pilot distribution repository.
2. Instruct hotel staff to install previous APK or push previous version code via MDM / Internal App Sharing.

### Server API Backward Compatibility
* Phase 1–6 backend APIs maintain complete backward compatibility with both Web PMS operators and earlier mobile app versions.
