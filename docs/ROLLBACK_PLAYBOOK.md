# StayOS — Production Rollback Playbook & Emergency Procedures

**Document Reference**: `docs/ROLLBACK_PLAYBOOK.md`  
**Generated Date**: August 31, 2026  
**Audited Engine**: Next.js 16, Prisma ORM, Zero-Downtime Releases  

---

## 1. Rollback Decision Framework

A rollback must be initiated immediately if any of the following conditions occur post-deployment:
1. **Critical P0 Defect**: Financial ledger mismatch, double-charging, or cross-tenant data leakage.
2. **Elevated Error Rate**: Unhandled HTTP 500 error rate exceeds $1.0\%$ across all requests.
3. **Database Lock Contention**: Migration causes transaction queue buildup exceeding 5 seconds.
4. **Auth / Session Failure**: Users unable to authenticate or maintain valid sessions across properties.

---

## 2. Emergency Rollback Execution Steps

```
[Trigger Detected]
        │
        ▼
1. Revert Container / Deployment Image to Previous Known-Good Hash
        │
        ▼
2. Verify Database Backward Compatibility
   ├── If schema change was purely additive (nullable column / new index) -> Keep DB as-is
   └── If schema change had breaking DDL -> Execute Point-In-Time Restore or Forward-Fix Patch
        │
        ▼
3. Clear Application & Distributed Redis Caches
        │
        ▼
4. Execute Deployment Smoke Test
   ├── GET /api/health/dashboard (HTTP 200)
   ├── POST /api/auth/login (HTTP 200)
   └── GET /api/reservations (HTTP 200)
        │
        ▼
5. Post-Mortem Incident Log & RCA
```

---

## 3. Safe Schema Evolution Guidelines

To ensure that rollbacks can execute in $< 5\text{ minutes}$ without requiring database rollbacks:
- **Never rename a column in a single release**: Add new column -> Dual write -> Migrate old data -> Drop old column in subsequent release.
- **Always add new columns as nullable or with defaults**: Prevents old code versions from failing when inserting records.
- **Non-blocking Index Creation**: Use `CREATE INDEX CONCURRENTLY` in production PostgreSQL databases to prevent table read/write locks during operational hours.
