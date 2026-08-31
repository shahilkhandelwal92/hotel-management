# StayOS — Enterprise Disaster Recovery & Business Continuity Plan

**Document Reference**: `docs/DISASTER_RECOVERY_PLAN.md`  
**Generated Date**: August 31, 2026  
**Recovery Targets**: RPO $\le 15\text{ minutes}$, RTO $\le 60\text{ minutes}$  

---

## 1. Recovery Objectives & SLA

A hotel PMS operates 24/7/365. Guests arrive at all hours, keycards must work, and bills must settle without disruption.

| Metric | Target SLA | Strategy |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | $\le 15\text{ minutes}$ | Continuous PostgreSQL WAL archiving + 6-hour automated logical snapshots |
| **Recovery Time Objective (RTO)** | $\le 60\text{ minutes}$ | Automated cold-standby restoration via containerized deployment infrastructure |
| **Maximum Data Loss** | 0 settled transactions | In-flight operations logged to distributed audit log |

---

## 2. Backup Strategy & Architecture

```
[StayOS Production Database]
           │
           ├─► Continuous WAL Archiving (Point-in-Time Recovery to any second)
           │
           ├─► Daily Automated Full Snapshot (02:00 AM Post-Night Audit)
           │
           └─► Tenant-Isolated Logical Export (Nightly JSON/CSV dump per hotelId)
```

---

## 3. Disaster Recovery Scenarios & Execution Playbooks

### Scenario A: Accidental Data Deletion (Single Hotel)
1. Duty manager reports accidental deletion of staff or menu records.
2. System extracts isolated tenant slice from latest 02:00 AM logical dump.
3. Import script restores deleted rows matching `hotelId` without affecting other properties.
4. Estimated RTO: $< 15\text{ minutes}$.

### Scenario B: Complete Database Outage / Corruption
1. Neon / AWS cloud region failure detected.
2. Provision standby PostgreSQL instance in secondary cloud region (e.g. `ap-south-1` Mumbai).
3. Restore latest base backup + replay WAL archives up to failure timestamp.
4. Update `DATABASE_URL` environment secret across Vercel / container cluster.
5. Execute deployment health check and resume traffic.
6. Estimated RTO: $< 45\text{ minutes}$.
