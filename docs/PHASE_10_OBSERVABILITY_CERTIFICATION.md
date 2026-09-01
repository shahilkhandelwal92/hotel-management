# StayOS Phase 10 Production Observability & Alert Routing

## 1. Monitored System Vectors
* **API Availability:** Uptime probe on `https://pms.stayos.com/api/auth/me`
* **API Latency:** p95 < 250ms target on core operational endpoints
* **Night Audit Alerts:** Automatic notification if night audit is not closed by 05:00 local time
* **401 Spike Detection:** Real-time alert on credential brute force or sudden session mass-expiration
* **Database Connection Saturation:** Warning alert at > 75% connection pool capacity
