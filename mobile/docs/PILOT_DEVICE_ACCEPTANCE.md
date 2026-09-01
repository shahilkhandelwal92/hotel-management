# StayOS Android Pilot Device Acceptance Report

## 1. Physical Device Test Environment
* **Hardware Devices:** Pixel 7 (Android 14 / API 34), Samsung Galaxy Tab S7 (Android 12 / API 31)
* **Application Package:** `com.stayos.operations` (v1.0.1, VersionCode 2)
* **Target Backend:** `https://pms.stayos.com`
* **Test Date:** September 1, 2026

---

## 2. Test Matrix

| Operational Workflow | Device Execution | Verification Status |
| :--- | :--- | :--- |
| **App Launch (No Metro)** | Clean cold launch from Android launcher | **PASS** |
| **Authentication & KeyStore**| Staff login with role credentials | **PASS** |
| **Housekeeping Board** | Room cleaning state progression | **PASS** |
| **Front Desk Check-In** | Walk-in creation & deposit collection | **PASS** |
| **Room Relocation** | Mid-stay room move with dirty room release | **PASS** |
| **POS Dining & KDS** | Table order $\rightarrow$ live kitchen queue | **PASS** |
| **Maintenance Work Order** | Plant equipment repair & room OOO lock | **PASS** |
| **Inventory Transfer** | Stock transfer requisition & receipt | **PASS** |
| **Checkout & Folio** | Zero-balance folio settlement & checkout | **PASS** |
| **Cashier Close** | Blind physical cash count & variance check | **PASS** |
