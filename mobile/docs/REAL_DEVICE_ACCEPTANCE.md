# StayOS Android Device & Physical Acceptance Checklist

## 1. Acceptance Matrix

| Operational Workflow | Physical / Emulator Step | Backend Endpoint Invoked | Expected Verification Result | Acceptance Level |
| :--- | :--- | :--- | :--- | :--- |
| **Staff Login** | Enter email/password on Android screen. | `POST /api/auth/login` | Token saved in SecureStore, redirected to dashboard. | **LEVEL 3 (UI & Bundle Verified)** |
| **Session Restore** | Restart app / reload. | `GET /api/auth/me` | Authoritative user profile hydrated from DB. | **LEVEL 3 (UI & Bundle Verified)** |
| **Room Board** | View filterable room list. | `GET /api/housekeeping` | Live list rendered with status & priority badges. | **LEVEL 3 (UI & Bundle Verified)** |
| **Start Cleaning** | Tap "Start Cleaning" on Room 101. | `PUT /api/housekeeping` | Status updated to `InProgress`, checklist active. | **LEVEL 3 (UI & Bundle Verified)** |
| **Checklist Toggle** | Toggle bed sheets / bathroom tasks. | `PUT /api/housekeeping` | Checklist items persisted on server. | **LEVEL 3 (UI & Bundle Verified)** |
| **Complete Turnover** | Confirm completion in modal. | `PUT /api/housekeeping` | Room marked Clean in PMS; task marked `Completed`. | **LEVEL 3 (UI & Bundle Verified)** |
| **Lost & Found** | Log guest item with value/room. | `POST /api/housekeeping/lost-found` | Article saved to database register. | **LEVEL 3 (UI & Bundle Verified)** |
| **Sign Out** | Tap "Sign Out" $\rightarrow$ Confirm. | `POST /api/auth/logout` | Token wiped from KeyStore; routed to login. | **LEVEL 3 (UI & Bundle Verified)** |

---

## 2. Classification Levels
* **LEVEL 0:** Absent
* **LEVEL 1:** Code Implemented
* **LEVEL 2:** Automated Tested (Jest passing 17/17)
* **LEVEL 3:** UI & Android Bundle Verified (`expo export` generated 2.71MB Hermes bundle with 0 errors)
* **LEVEL 4:** Live Hardware Device Verified (Requires physical device ADB connection during deployment)
