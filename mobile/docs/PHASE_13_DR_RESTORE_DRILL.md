# StayOS Phase 13 — Disaster Recovery Restore Drill

## 1. Database Architecture & Continuous Protection
* **Provider:** PostgreSQL 16 on Neon Serverless with connection pooling.
* **Continuous WAL Archiving:** Point-in-Time Recovery (PITR) with continuous write-ahead log retention (7–30 days).
* **Target RPO:** < 5 minutes.
* **Target RTO:** < 30 minutes.

---

## 2. Isolated Non-Destructive Restore Drill Protocol
1. Create an isolated recovery branch from a specific point-in-time timestamp:
   ```bash
   neon branches create --from-point-in-time <ISO_TIMESTAMP>
   ```
2. Validate database schema integrity using `npx prisma validate`.
3. Verify core data models: `Hotel`, `Room`, `Reservation`, `Folio`, `FolioTransaction`, `NightAudit`.
4. Point staging environment to the restored connection string and execute the full test suite.
5. **Drill Classification:** `VERIFIED (Neon Continuous PITR Active)` / `Physical Production Cluster Drill: UNVERIFIED (Production Non-Destructive Safeguard Enforced)`.
