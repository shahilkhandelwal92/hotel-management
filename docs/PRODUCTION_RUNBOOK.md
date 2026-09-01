# StayOS Production Operations Runbook

## 1. System Architecture & Topology
* **Web Frontend / Backend:** Next.js 16 (App Router + Server Actions / Route Handlers) on Node.js 20+
* **Mobile Client:** React Native 0.76.6 / Expo SDK 52 (`com.stayos.operations`)
* **Primary Database:** PostgreSQL 16 on Neon with connection pooling & Point-in-Time Recovery (PITR)
* **ORM & Migrations:** Prisma 6.4.1

---

## 2. Standard Operating Procedures (SOP)

### Starting Daily Shift
1. Staff opens StayOS Operations app on Android device or browser PMS.
2. Authenticates using role-assigned staff credentials.
3. Cashiers open physical cash drawer with verified opening float count.

### Night Audit Execution Procedure
1. Verify all departures are checked out and active guest folios are posted.
2. Navigate to `Night Audit` module $\rightarrow$ trigger "Run Night Audit".
3. System posts room charges, generates daily revenue summaries, and rolls over business date.
