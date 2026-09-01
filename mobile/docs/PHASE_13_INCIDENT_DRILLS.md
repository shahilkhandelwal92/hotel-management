# StayOS Phase 13 — Incident Response Drills

## 1. Incident Scenarios Evaluated

| Scenario | Incident Injected | Containment & Recovery Action | Verification Result |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | Database connectivity degradation | Prisma retry & connection pooling failover | PASS (No orphaned state) |
| **Scenario 2** | API endpoint unreachable | Mobile client shows offline retry banner; CTAs disabled | PASS (No duplicate submissions) |
| **Scenario 3** | User session compromised / revoked | Instant deactivation via Admin Portal; 401 wipes KeyStore | PASS (Immediate redirect to login) |
| **Scenario 4** | Night Audit delayed past 05:00 | Automated alert sent to General Manager / Duty Auditor | PASS (Escalation triggered) |
| **Scenario 5** | Cashier float shortage / discrepancy | Cashier forced to record blind count; manager must approve | PASS (Zero self-approval) |
| **Scenario 6** | Android mobile network disconnection | Network state hook blocks action until connection restored | PASS (Safe retry) |
