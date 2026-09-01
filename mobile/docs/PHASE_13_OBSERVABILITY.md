# StayOS Phase 13 — Production Observability & Alerting

## 1. APM Thresholds & Alerts
* **Service Availability:** Probe on `https://pms.stayos.com/api/auth/me` (> 99.9% uptime target).
* **Mutation Latency:** p95 < 250ms on core operational routes.
* **401/403 Spikes:** Rate alert if 401/403 responses exceed 5% of total traffic.
* **Connection Pool Saturation:** Alert at > 75% active connection pool capacity.
* **Night Audit Notification:** Escalation alert triggered if night audit fails or is delayed past 05:00.
