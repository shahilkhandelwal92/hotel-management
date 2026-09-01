# StayOS Production Monitoring & Health Matrix

## 1. Monitored Vectors & Thresholds
* **API Availability:** Uptime ping on `https://pms.stayos.com/api/auth/me` (> 99.9% target)
* **API Latency:** p95 < 250ms for core operational queries
* **Database Connection Saturation:** Connection pool usage < 80%
* **JWT Expiration & Rejections:** Monitor 401 surge alerts (credential stuffing protection)
* **Night Audit Completion:** Night audit execution failure alert triggers P1 on-call notification
