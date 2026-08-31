# STAYOS — GENUINE MISSING CAPABILITIES & OPERATIONAL GAPS REGISTER

**Audit Date:** August 31, 2026  
**Auditor:** Principal Enterprise PMS Architect & Lead QA Auditor  

---

## 1. Operational Infrastructure Gaps (External to Codebase)

| Gap ID | Operational Area | Description & Business Reason | Severity | Launch Blocking? | Recommended Resolution Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-001** | **Distributed Load Testing** | 100-way local concurrency passed; distributed 2,000+ user multi-node cluster load test has not been executed on staging infrastructure. | High | **No for Single Property Pilot; Yes for Global 500-Property SaaS Launch** | Spin up distributed k6 / Locust cluster on AWS/GCP to run synthetic 2,000-user load. |
| **GAP-002** | **Disaster Recovery Restore Drill** | Point-in-time recovery is active on Neon PostgreSQL; a physical manual restore drill against a cold staging database was not executed during this release. | Medium | **No for Pilot** | Execute scheduled quarterly DR drill with Neon administrative CLI. |
| **GAP-003** | **Live Commercial OTA XML Gateway** | Channel manager internal adapter, mapping, and sync engines are 100% verified via test suites; commercial live credentials (Expedia Partner Central / Booking.com Connectivity) must be bound on site. | Low | **No (Expected Onboarding Step)** | Bind hotel partner XML endpoint credentials during property onboarding. |
| **GAP-004** | **Physical Door Lock IP Bridge** | Smart access digital key token generation and access scopes verified via `MockProvider`; physical Assa Abloy / Onity IP bridges require on-premise network gateway pairing. | Low | **No (Expected Onboarding Step)** | Configure on-premise encoder/bridge IP address in Hotel Admin Settings. |

---

## 2. In-Code Functional Assessment

No critical functional PMS engines are missing from the code repository. The system covers:
- Complete Reservations, Walk-Ins, Waitlists, Group Blocks
- Split Folios (Windows 1–4), Multi-Float Cashier Shifts, AR City Ledger, AP 3-Way Match
- Multi-Store Inventory, Linen Accounting, Minibar Audit, Engineering Work Orders
- Banquet BEOs, Corporate Negotiated Rates, Loyalty Ledger, Survey Service Recovery
- Night Audit Business Day Rolls, Multi-Currency FX, and Indian Statutory HR/Payroll.
