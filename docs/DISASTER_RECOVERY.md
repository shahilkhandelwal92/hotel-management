# StayOS Disaster Recovery & Business Continuity Plan

## 1. Recovery Objectives
* **Recovery Point Objective (RPO):** < 5 minutes (via Neon Continuous WAL & PITR)
* **Recovery Time Objective (RTO):** < 30 minutes (database restore & DNS switch)

---

## 2. Database Backup & Restore Procedure
1. Neon automatically archives WAL logs for 7–30 days.
2. In the event of catastrophic data corruption, initiate Point-in-Time Recovery via management CLI or console:
   ```bash
   neon branches create --from-point-in-time <ISO_TIMESTAMP>
   ```
3. Update `DATABASE_URL` in production backend environment variables.
4. Run `npx prisma validate` and execute regression verification suite.
