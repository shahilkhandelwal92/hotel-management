# StayOS Phase 9 Production Observability & Monitoring Matrix

## 1. Monitoring Metrics & Alerting Thresholds
* **API Availability:** Uptime ping on `/api/auth/me` (> 99.9% target)
* **API Latency:** p95 < 250ms for core operational queries
* **Database Connection Saturation:** Connection pool usage < 80%
* **JWT Expiration & Rejections:** Monitor 401 surge alerts
* **Night Audit Execution:** Night audit failure triggers immediate on-call escalation

---

## 2. Incident Severity Framework

| Severity | Incident Description | Target SLA | Resolution Path |
| :--- | :--- | :--- | :--- |
| **P0** | System outage, financial corruption, cross-tenant security breach | < 15 min | Immediate rollback or Point-in-Time DB restore |
| **P1** | Core hotel workflow blocked (e.g. Check-in or POS down) | < 30 min | Duty Manager escalation & server patch deployment |
| **P2** | Non-critical feature degraded with workaround | < 2 hours | Operations support team triage |
| **P3** | Cosmetic UI bug or minor latency fluctuation | < 24 hours | Product maintenance backlog |
