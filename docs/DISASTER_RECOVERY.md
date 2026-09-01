# StayOS — Production Disaster Recovery & Data Protection Policy

## 1. Database Architecture & Continuous Archiving
* **Database Provider:** PostgreSQL 16 on Neon Serverless with connection pooling.
* **Continuous WAL Archiving:** Write-Ahead Logs (WAL) continuously streamed to resilient cloud storage.
* **Retention Period:** 7 days standard (expandable to 30 days for enterprise tiers).
* **Recovery Point Objective (RPO):** < 5 minutes.
* **Recovery Time Objective (RTO):** < 30 minutes.

---

## 2. Non-Destructive Isolated Recovery Procedure
1. Identify target recovery timestamp (e.g. pre-incident ISO timestamp).
2. Create isolated recovery branch via Neon CLI:
   ```bash
   neon branches create --from-point-in-time <ISO_TIMESTAMP>
   ```
3. Run schema validation: `npx prisma validate`.
4. Run core data integrity queries to verify Hotels, Rooms, Folios, and Night Audit snapshots.
5. Direct staging or fallback instance to restored connection string.
6. Verify operational workflows before resuming live traffic.
