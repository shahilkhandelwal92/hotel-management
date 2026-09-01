# StayOS Android Google Play Release Checklist

## 1. Store Listing & Metadata
* **App Name:** StayOS Operations
* **Package Name:** `com.stayos.operations`
* **Version:** `1.0.1` (VersionCode: `2`)
* **Category:** Business / Productivity
* **Target Audience:** Hotel Operations Staff & Management

---

## 2. Release Artifacts & Compliance
* **Android App Bundle (AAB):** Generated under `android/app/build/outputs/bundle/release/app-release.aab`
* **Signing:** Configured with production PKCS12 upload keystore
* **Target SDK:** Android 14 (API 34)
* **Permissions Declared:** `android.permission.INTERNET`, `android.permission.ACCESS_NETWORK_STATE`
* **Data Safety:** Zero sensitive user data sold; tokens stored exclusively in hardware KeyStore
