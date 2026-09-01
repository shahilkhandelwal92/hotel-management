# StayOS — Post-Go-Live Hypercare & v1.0.2 Readiness Protocol

---

## 1. Production Release Baseline
* **Current Certified Release:** `v1.0.1` (VersionCode `2`)
* **Branch:** `feature/stayos-android`
* **Release Baseline Commit:** `e1982e91122da19f563d76e7379d03126ec6df06`
* **Production API:** `https://pms.stayos.com`
* **Android Application ID:** `com.stayos.operations`

---

## 2. Production Observability & Telemetry
* **Uptime Monitoring:** Real-time health heartbeat on `/api/auth/me`.
* **API Mutation Latency:** p95 $< 250$ms threshold for Front Desk, Folio, POS, and Cashier routes.
* **401/403 Rate Alerts:** Threshold triggered if client authentication rejections exceed 5% of total traffic.
* **Connection Pool Saturation:** Automated notification at $> 75\%$ Neon connection pool utilization.
* **Night Audit Guard:** Automated escalation alert triggered if night audit fails or is unexecuted past 05:00.

---

## 3. Incident Classification & Escalation Matrix

| Severity | Incident Description | Response SLA | Target Resolution | Escalation Contact |
| :--- | :--- | :--- | :--- | :--- |
| **P0 (Blocker)** | Financial corruption, cross-tenant data leakage, authentication bypass, database outage | < 15 min | < 1 hour | Duty Lead & Infrastructure Ops |
| **P1 (Critical)** | Core workflow blocked (check-in, zero-balance checkout, cashier close, night audit failure) | < 30 min | < 2 hours | Operations Lead & Senior Engineer |
| **P2 (Major)** | Departmental workflow degraded with no workaround | < 2 hours | < 8 hours | Customer Support & Engineering |
| **P3 (Minor)** | Non-blocking UI glitch, visual formatting inconsistency, minor performance variance | < 24 hours | Next scheduled release | Product Maintenance Backlog |

---

## 4. Financial & Security Incident Response Procedures
* **Zero Database Workarounds:** Real hotel staff must never execute SQL, direct API calls, or manual database edits. All adjustments must occur through standard application transactions, reversals, or credit notes.
* **Financial Ledger Balancing:** Daily verification that $\text{Charges} - \text{Payments} - \text{Credits} = ₹0.00$ at departure and $\text{Opening Float} + \text{Collections} - \text{Drops} - \text{Paid Outs} = \text{Physical Cash}$.
* **Token Compromise / Revocation:** Instant user deactivation via the Admin Portal immediately invalidates JWT sessions server-side and forces an Android KeyStore session wipe.

---

## 5. Rollback Strategy & v1.0.2 Release Governance
* **Rollback Protocol:** In the event of a critical deployment failure, revert application binaries to certified baseline `v1.0.1` and point staging to the latest point-in-time recovery WAL snapshot.
* **v1.0.2 Release Criteria:** Code modifications are strictly restricted to confirmed production defects, security fixes, or verified reliability improvements that have passed the complete 307-test regression suite.
