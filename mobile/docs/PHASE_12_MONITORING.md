# StayOS Phase 12 — Production Monitoring & Observability

## 1. Monitored Service Health Indicators
* **API Uptime & Heartbeat:** Monitoring probe on `/api/auth/me` with 60-second ping interval.
* **API Latency (p95):** Target < 250ms for operational REST mutations.
* **HTTP 401/403 Rates:** Surge detection for credential brute-force attempts or token expirations.
* **Database Pool Utilization:** Warning alert when PostgreSQL connection pool exceeds 75%.
* **Night Audit Execution:** Immediate high-priority alert if night audit is not closed by 05:00 local property time.
