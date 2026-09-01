# StayOS Phase 8 Android Real-Device Acceptance Log

## 1. Environment & Hardware
* **Hardware Devices Tested:** Pixel 7 (Android 14 / API 34), Samsung Galaxy Tab S7 (Android 12 / API 31)
* **Application Package:** `com.stayos.operations` (v1.0.1, VersionCode 2)
* **API Target:** `https://pms.stayos.com`

---

## 2. Real-Device Functional Acceptance

| Module / Screen | Test Action | Result |
| :--- | :--- | :--- |
| **Authentication** | Cold launch $\rightarrow$ Login with valid JWT $\rightarrow$ KeyStore Token store | **PASS** |
| **Housekeeping Board** | Toggle room clean/dirty, room inspection | **PASS** |
| **Front Desk** | Reservation lookup, check-in, deposit collection | **PASS** |
| **Room Relocation** | Mid-stay room move with dirty room release | **PASS** |
| **Split Folio (1–4)** | Window balance transfer, payment posting, zero-balance checkout | **PASS** |
| **Cashier Shifts** | Opening float, paid-outs, blind count close, variance report | **PASS** |
| **Restaurant POS & KDS** | Table order $\rightarrow$ KOT queue $\rightarrow$ Preparing $\rightarrow$ Ready | **PASS** |
| **Engineering** | Work order logging, Room 801 OOO lock & release to Dirty | **PASS** |
| **Stores Inventory** | Requisition 40 bed sheets $\rightarrow$ Dispatch $\rightarrow$ Receive | **PASS** |
| **Token Expiry Purge** | Forced 401 response $\rightarrow$ KeyStore token wiped $\rightarrow$ Login redirect | **PASS** |
