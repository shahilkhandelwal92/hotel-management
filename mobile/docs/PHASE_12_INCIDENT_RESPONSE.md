# StayOS Phase 12 — Incident Response & Escalation Framework

## 1. Severity Levels & Incident SLAs

| Severity | Incident Description | Response SLA | Target Resolution | Escalation Contact |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | PMS service offline, database connection loss, tenant data leakage | < 15 min | < 1 hour | Duty Lead & Infrastructure Ops |
| **P1** | Front desk check-in blocked, cashier reconciliation corrupted | < 30 min | < 2 hours | Operations Lead & Senior Engineer |
| **P2** | Non-critical department degraded (e.g. Minibar auto-sync down) | < 2 hours | < 8 hours | Support Team |
| **P3** | Minor UI layout glitch, non-blocking cosmetic bug | < 24 hours | Next sprint | Maintenance Backlog |

---

## 2. Containment & Disaster Recovery
* **Database Rollback:** Neon Point-in-Time Recovery (PITR) enables restoring to an isolated staging branch within minutes.
* **Token Compromise:** Instant session revocation through user deactivation in the Admin Portal.
