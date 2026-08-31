# StayOS — Enterprise Observability, Logging & Alerting Guide

**Document Reference**: `docs/OBSERVABILITY_GUIDE.md`  
**Generated Date**: August 31, 2026  
**Audited Engine**: Winston Logger, Next.js Telemetry, Audit Logs  

---

## 1. Structured Logging Standards

Every API request and system mutation produces structured JSON log entries incorporating standard tracing identifiers:

```json
{
  "timestamp": "2026-08-31T17:30:00.123Z",
  "level": "info",
  "requestId": "req_8f7b2c91a0",
  "hotelId": "hotel_delhi_aerocity",
  "userId": "usr_reception_01",
  "module": "Reservation",
  "action": "CHECKIN",
  "entityId": "res_889211",
  "latencyMs": 42,
  "statusCode": 200,
  "ipAddress": "192.168.1.50",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
}
```

---

## 2. Core Telemetry Metrics

| Metric Name | Type | Target SLA | Alert Threshold | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stayos_pms_reservation_duration_ms` | Histogram | $< 100\text{ ms}$ | $> 500\text{ ms}$ (P95) | Time required to process and lock room reservations |
| `stayos_pms_checkout_latency_ms` | Histogram | $< 150\text{ ms}$ | $> 750\text{ ms}$ (P95) | Time required to finalize folio and issue invoice |
| `stayos_payment_success_rate` | Gauge | $> 99.5\%$ | $< 95.0\%$ over 5m | Successful payment settlements vs attempts |
| `stayos_night_audit_duration_sec` | Gauge | $< 30\text{ s}$ | $> 120\text{ s}$ | Full night audit processing duration |
| `stayos_api_5xx_rate` | Gauge | $< 0.1\%$ | $> 2.0\%$ over 2m | Unhandled server error rate |

---

## 3. Production Alerting Rules & Escalation

1. **P0 Alert — Night Audit Failure**:
   - Condition: `night_audit_status == FAILED` or duration $> 180\text{s}$.
   - Action: PagerDuty / WhatsApp notification to Duty Manager and Engineering Lead.
2. **P0 Alert — Payment Gateway Failure Spike**:
   - Condition: 3 consecutive webhook signature errors or gateway timeout $> 10\%$.
   - Action: Automated failover notification and accounting flag.
3. **P1 Alert — Stock Depletion Threshold**:
   - Condition: `GroceryStock.quantity <= GroceryStock.minStockThreshold`.
   - Action: Real-time KDS banner and F&B Manager procurement notice.
4. **P1 Alert — Rate-Limit Abuse**:
   - Condition: Single IP triggers $> 50$ rate-limit blocks within 5 minutes.
   - Action: Automatic IP ban addition to `IpBlacklist`.
