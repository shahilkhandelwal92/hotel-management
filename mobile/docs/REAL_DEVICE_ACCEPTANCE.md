# StayOS Android Real Device Acceptance Report

## 1. Acceptance Environment
* **Platform:** Android 14 (API 34) & Android 12 (API 31)
* **Application:** StayOS Operations v1.0.1 (Version Code 2)
* **Package Name:** `com.stayos.operations`
* **Bundle:** 2.96 MB Hermes Bytecode
* **Backend:** StayOS Authoritative PMS HTTPS Backend

---

## 2. Real Operator Lifecycle Acceptance

| Operational Stage | Device Action | Expected Outcome | Verification |
| :--- | :--- | :--- | :--- |
| **1. Cold Boot & Login** | Launch app without Metro dev server | Clean dark splash screen $\rightarrow$ Login prompt | **PASS** |
| **2. Session KeyStore** | Authenticate staff credentials | JWT token persisted in KeyStore | **PASS** |
| **3. Housekeeping** | View Room Board $\rightarrow$ Start cleaning | Room state changes to `Cleaning` | **PASS** |
| **4. Front Desk Walk-In**| Create walk-in $\rightarrow$ Collect ₹2,000 | Deposit credited to Folio Window 1 | **PASS** |
| **5. Room Move** | Relocate in-stay reservation to Room 204 | Occupancy moved atomically, old room dirty | **PASS** |
| **6. Cashier Shift** | Open shift float ₹5,000 $\rightarrow$ Blind count close | Shift closed, variance escalated if non-zero | **PASS** |
| **7. Restaurant & KDS** | Order Table 4 $\rightarrow$ Send KOT | Instant appearance on Kitchen KDS queue | **PASS** |
| **8. Maintenance & OOO**| Report AC leak Room 304 | Room 304 set to `Maintenance`, blocked | **PASS** |
| **9. Stores Transfer** | Requisition 50 Bed Sheets $\rightarrow$ Issue | Transfer dispatched $\rightarrow$ Received | **PASS** |
| **10. Logout & Wipe** | Staff logs out | Token wiped, SecureStore cleaned | **PASS** |
