# StayOS Phase 10 Disaster Recovery & Restore Protocol

## 1. Database Architecture & Continuous Protection
* **Database Provider:** PostgreSQL 16 on Neon with connection pooling.
* **Point-in-Time Recovery (PITR):** Neon Continuous Write-Ahead Log (WAL) archiving (7–30 day retention).
* **Target Recovery Point Objective (RPO):** < 5 minutes.
* **Target Recovery Time Objective (RTO):** < 30 minutes.

---

## 2. Isolated Non-Destructive Restore Drill Protocol
1. Initiate branch restore from specific timestamp:
   ```bash
   neon branches create --from-point-in-time <ISO_TIMESTAMP>
   ```
2. Point staging environment to restored branch connection string.
3. Validate schema integrity with `npx prisma validate`.
4. Verify core records (Hotels, Rooms, Folios, Reservations, Night Audits).
5. Run full automated regression test suite against restored database target.
