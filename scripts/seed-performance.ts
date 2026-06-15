#!/usr/bin/env node
/**
 * Hotel SaaS — Performance Seed & Deep Benchmark
 * ──────────────────────────────────────────────────────────────
 * Seeds 260k+ rows then runs:
 *   1. Individual query benchmarks (minimal vs full-include)
 *   2. Concurrent load simulation (10 parallel requests)
 *   3. EXPLAIN ANALYZE for slowest query (Postgres only)
 *
 * Usage:
 *   ENABLE_PERF_SEED=true npx tsx scripts/seed-performance.ts
 *
 * Cleanup after test:
 *   DELETE FROM "Reservation" WHERE "hotelId" = '<perf-hotel-id>'
 *   (cascades to invoices, audit logs via FK)
 */

import { PrismaClient } from "@prisma/client";

// ── Safety gate ───────────────────────────────────────────────
if (process.env.ENABLE_PERF_SEED !== "true") {
    console.error("\n❌  ENABLE_PERF_SEED=true is required.");
    console.error("   This script writes 260k rows. Set the env var to confirm intent.\n");
    process.exit(1);
}

const prisma = new PrismaClient({
    log: [], // silence during seeding for cleaner output
});

// ── Config ────────────────────────────────────────────────────
const RESERVATION_COUNT = 10_000;
const INVOICES_PER_RESERVATION = 5;    // → 50,000 invoices
const AUDIT_PER_RESERVATION = 20;     // → 200,000 audit logs
const BATCH = 500;
const CONCURRENCY = 10;                // parallel requests for load test

const GUEST_NAMES = ["Rahul Mehta", "Priya Shah", "Amit Gupta", "Sunita Nair", "Vikram Patel", "Anjali Roy", "Deepak Joshi", "Kavitha Menon", "Arjun Singh", "Pooja Reddy"];
const STATUSES = ["Confirmed", "CheckedIn", "CheckedOut", "Cancelled", "NoShow"];
const BOOKING_TYPES = ["Direct", "OTA", "Corporate", "Walkin", "GroupBlock"];
const AUDIT_ACTIONS = ["CREATE", "UPDATE", "CHECKIN", "CHECKOUT", "PAYMENT_RECEIVED", "OVERBOOK_ATTEMPT"];
const AUDIT_MODULES = ["Reservation", "Invoice", "Payment", "Folio", "Room", "User"];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uuid() { return crypto.randomUUID(); }
function bar(ms: number): string {
    const b = ms < 50 ? "🟢🟢🟢🟢" : ms < 100 ? "🟢🟢🟢⬜" : ms < 300 ? "🟡🟡⬜⬜" : ms < 500 ? "🟠⬜⬜⬜" : "🔴⬜⬜⬜";
    return `${String(ms).padStart(6)}ms  ${b}`;
}

// ── Seed helpers ──────────────────────────────────────────────
async function getOrCreateTestHotel(): Promise<{ id: string }> {
    const existing = await prisma.hotel.findFirst({
        where: { name: { contains: "PERF_TEST" } },
        select: { id: true },
    });
    if (existing) { console.log(`♻️  Reusing PERF_TEST hotel: ${existing.id}`); return existing; }

    const user = await prisma.user.create({
        data: { name: "PerfTest Admin", email: `perftest_${Date.now()}@test.local`, password: "x" },
    });
    const h = await prisma.hotel.create({
        data: {
            name: "PERF_TEST Hotel",
            location: "Mumbai, Maharashtra",
            address: "123 Test Street, Bandra West",
            phone: "0000000000",
            email: `perf+${Date.now()}@test.local`,
        },
    });
    // Link user to hotel
    await prisma.user.update({ where: { id: user.id }, data: { hotelId: h.id } });


    console.log(`✅ Created PERF_TEST hotel: ${h.id}`);
    return { id: h.id };
}

async function seedReservations(hotelId: string): Promise<void> {
    const existing = await prisma.reservation.count({ where: { hotelId } });
    if (existing >= RESERVATION_COUNT) { console.log(`♻️  ${existing.toLocaleString()} reservations already seeded, skipping.`); return; }

    console.log(`\n📅 Seeding ${RESERVATION_COUNT.toLocaleString()} reservations...`);
    const t = Date.now();
    let total = 0;

    for (let b = 0; b < RESERVATION_COUNT / BATCH; b++) {
        const rows = Array.from({ length: BATCH }, (_, i) => {
            const checkIn = new Date(Date.now() - rand(1, 730) * 86400000);
            const nights = rand(1, 7);
            const base = rand(2000, 15000);
            const tax = base * 0.12;
            return {
                id: uuid(), hotelId,
                bookingRef: `PERF-${String(b * BATCH + i + 1).padStart(7, "0")}`,
                guestName: pick(GUEST_NAMES), guestPhone: `98${rand(10000000, 99999999)}`,
                checkIn, checkOut: new Date(checkIn.getTime() + nights * 86400000),
                adults: rand(1, 3), status: pick(STATUSES), bookingType: pick(BOOKING_TYPES),
                baseAmount: base, taxAmount: tax, totalAmount: base + tax,
                advanceDeposit: rand(0, base * 0.3), balanceDue: tax,
                createdAt: new Date(checkIn.getTime() - rand(1, 30) * 86400000),
            };
        });
        await prisma.reservation.createMany({ data: rows });
        total += rows.length;
        process.stdout.write(`\r  ${total.toLocaleString()} / ${RESERVATION_COUNT.toLocaleString()}`);
    }
    console.log(`\n  ✅ Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

async function seedInvoices(hotelId: string): Promise<void> {
    const target = RESERVATION_COUNT * INVOICES_PER_RESERVATION;
    const existing = await prisma.invoice.count({ where: { hotelId } });
    if (existing >= target) { console.log(`♻️  ${existing.toLocaleString()} invoices already seeded, skipping.`); return; }

    console.log(`\n🧾 Seeding ${target.toLocaleString()} invoices...`);
    const t = Date.now();
    let count = 0;

    for (let offset = 0; offset < RESERVATION_COUNT; offset += 1000) {
        const reservations = await prisma.reservation.findMany({
            where: { hotelId }, select: { id: true, guestName: true },
            skip: offset, take: 1000, orderBy: { createdAt: "asc" },
        });
        const rows = reservations.flatMap((r) =>
            Array.from({ length: INVOICES_PER_RESERVATION }, (_, i) => {
                const sub = rand(1000, 8000);
                const tax = sub * 0.12;
                return {
                    id: uuid(), hotelId, reservationId: r.id,
                    invoiceNumber: `PINV-${Date.now()}-${count++}-${i}`,
                    invoiceType: i === 0 ? "TAX" : pick(["TAX", "PROFORMA"]) as string,
                    billedToName: r.guestName,
                    subTotal: sub, cgst: tax / 2, sgst: tax / 2, igst: 0,
                    totalTax: tax, grandTotal: sub + tax, roundOff: 0,
                    status: pick(["Paid", "Unpaid", "PartialPaid"]) as string,
                    createdAt: new Date(Date.now() - rand(1, 730) * 86400000),
                };
            })
        );
        await prisma.invoice.createMany({ data: rows });
        process.stdout.write(`\r  ${Math.min(count, target).toLocaleString()} / ${target.toLocaleString()}`);
    }
    console.log(`\n  ✅ Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

async function seedAuditLogs(hotelId: string): Promise<void> {
    const target = RESERVATION_COUNT * AUDIT_PER_RESERVATION;
    const existing = await prisma.auditLog.count({ where: { hotelId } });
    if (existing >= target) { console.log(`♻️  ${existing.toLocaleString()} audit logs already seeded, skipping.`); return; }

    console.log(`\n📋 Seeding ${target.toLocaleString()} audit logs...`);
    const t = Date.now();
    let count = 0;

    for (let b = 0; b < target / BATCH; b++) {
        const entityIds = Array.from({ length: 10 }, () => uuid()); // shared entityIds → realistic clustering
        const rows = Array.from({ length: BATCH }, () => ({
            id: uuid(), hotelId,
            module: pick(AUDIT_MODULES), action: pick(AUDIT_ACTIONS),
            entityId: pick(entityIds),
            details: `Perf seed #${count++}`,
            ipAddress: `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
            createdAt: new Date(Date.now() - rand(1, 730) * 86400000),
        }));
        await prisma.auditLog.createMany({ data: rows });
        if (b % 20 === 0) process.stdout.write(`\r  ${Math.min(count, target).toLocaleString()} / ${target.toLocaleString()}`);
    }
    console.log(`\n  ✅ Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

// ── Benchmark helpers ─────────────────────────────────────────
type BenchResult = { label: string; ms: number; rows: number; verdict: string };

async function time(label: string, fn: () => Promise<unknown[]>): Promise<BenchResult> {
    const t = Date.now();
    const rows = await fn();
    const ms = Date.now() - t;
    const verdict = ms < 100 ? "🟢 Excellent" : ms < 300 ? "🟡 Good" : ms < 500 ? "🟠 Acceptable" : "🔴 SLOW — needs tuning";
    return { label, ms, rows: rows.length, verdict };
}

async function timeSingle(label: string, fn: () => Promise<unknown>): Promise<BenchResult> {
    const t = Date.now();
    await fn();
    const ms = Date.now() - t;
    const verdict = ms < 100 ? "🟢 Excellent" : ms < 300 ? "🟡 Good" : ms < 500 ? "🟠 Acceptable" : "🔴 SLOW — needs tuning";
    return { label, ms, rows: 1, verdict };
}

// ── EXPLAIN ANALYZE via raw SQL ───────────────────────────────
async function explainAnalyze(label: string, sql: string, params: unknown[] = []): Promise<void> {
    console.log(`\n🔬 EXPLAIN ANALYZE: ${label}`);
    try {
        const result = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`, ...params);
        const lines = (result as Array<{ "QUERY PLAN": string }>).map((r) => r["QUERY PLAN"]);
        lines.forEach((l) => console.log(`  ${l}`));
        // Highlight index usage
        const usesIndex = lines.some((l) => l.toLowerCase().includes("index"));
        console.log(`  → ${usesIndex ? "✅ Index used" : "⚠️ FULL TABLE SCAN — check indexes!"}`);
    } catch (e) {
        console.log(`  (EXPLAIN not available: ${(e as Error).message})`);
    }
}

// ── Concurrent load test ──────────────────────────────────────
async function concurrentLoad(hotelId: string): Promise<void> {
    console.log(`\n⚡ Concurrent load test: ${CONCURRENCY} parallel reservation queries`);
    const queryFn = () => prisma.reservation.findMany({
        where: { hotelId, status: { in: ["Confirmed", "CheckedIn"] } },
        select: { id: true, bookingRef: true, guestName: true, checkIn: true, checkOut: true, status: true },
        orderBy: { checkIn: "desc" },
        take: 50,
    });

    const t = Date.now();
    await Promise.all(Array.from({ length: CONCURRENCY }, queryFn));
    const total = Date.now() - t;
    const perReq = Math.round(total / CONCURRENCY);
    const verdict = perReq < 200 ? "🟢 Excellent under concurrency" : perReq < 500 ? "🟡 Acceptable" : "🔴 Concurrency bottleneck";
    console.log(`  ${CONCURRENCY} parallel queries in ${total}ms = ~${perReq}ms/req — ${verdict}`);
}

// ── Main benchmark suite ──────────────────────────────────────
async function benchmark(hotelId: string): Promise<void> {
    console.log("\n⚡ Benchmarking key queries...\n");
    const results: BenchResult[] = [];

    // ── Reservation queries ────────────────────────────────────
    results.push(await time("Reservation list - minimal columns (50)", () =>
        prisma.reservation.findMany({
            where: { hotelId, status: { in: ["Confirmed", "CheckedIn"] } },
            select: { id: true, bookingRef: true, guestName: true, checkIn: true, checkOut: true, status: true, totalAmount: true },
            orderBy: { checkIn: "desc" }, take: 50,
        })
    ));

    results.push(await time("Reservation list - with room include (50)", () =>
        prisma.reservation.findMany({
            where: { hotelId },
            include: { room: { select: { number: true, type: true } } },
            orderBy: { createdAt: "desc" }, take: 50,
        })
    ));

    results.push(await timeSingle("Reservation count by hotel", () =>
        prisma.reservation.count({ where: { hotelId } })
    ));

    results.push(await timeSingle("Reservation groupBy status", () =>
        prisma.reservation.groupBy({ by: ["status"], where: { hotelId }, _count: { status: true } })
    ));

    // ── Invoice queries ────────────────────────────────────────
    results.push(await time("Invoice list - minimal columns (50)", () =>
        prisma.invoice.findMany({
            where: { hotelId, status: "Unpaid" },
            select: { id: true, invoiceNumber: true, billedToName: true, grandTotal: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" }, take: 50,
        })
    ));

    results.push(await timeSingle("Invoice aggregate (sum grandTotal, cgst, sgst)", () =>
        prisma.invoice.aggregate({
            where: { hotelId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
            _sum: { grandTotal: true, cgst: true, sgst: true, igst: true },
            _count: { id: true },
        })
    ));

    results.push(await timeSingle("Invoice groupBy status", () =>
        prisma.invoice.groupBy({ by: ["status"], where: { hotelId }, _count: { id: true }, _sum: { grandTotal: true } })
    ));

    // ── AuditLog queries ───────────────────────────────────────
    results.push(await time("AuditLog timeline by hotelId (50 latest)", () =>
        prisma.auditLog.findMany({
            where: { hotelId },
            select: { id: true, action: true, module: true, entityId: true, createdAt: true, ipAddress: true },
            orderBy: { createdAt: "desc" }, take: 50,
        })
    ));

    results.push(await time("AuditLog timeline by entityId (50 latest)", async () => {
        // Get a real entityId from the seed data first
        const sample = await prisma.auditLog.findFirst({ where: { hotelId }, select: { entityId: true } });
        return prisma.auditLog.findMany({
            where: { entityId: sample?.entityId ?? "", hotelId },
            select: { id: true, action: true, module: true, createdAt: true, details: true },
            orderBy: { createdAt: "desc" }, take: 50,
        });
    }));

    // ── Print table ────────────────────────────────────────────
    const maxLabel = Math.max(...results.map((r) => r.label.length));
    console.log("─".repeat(maxLabel + 30));
    results.forEach((r) => {
        const label = r.label.padEnd(maxLabel);
        console.log(`  ${label}  ${bar(r.ms)}  ${r.verdict}`);
    });
    console.log("─".repeat(maxLabel + 30));

    const slow = results.filter((r) => r.ms > 500);
    if (slow.length === 0) {
        console.log("\n✅ All queries < 500ms — production-ready for initial hotel load.");
    } else {
        console.log(`\n⚠️  ${slow.length} query/queries exceeded 500ms:`);
        slow.forEach((r) => console.log(`   → ${r.label}: ${r.ms}ms`));
    }

    // ── Concurrent load ────────────────────────────────────────
    await concurrentLoad(hotelId);

    // ── EXPLAIN ANALYZE for slowest query ─────────────────────
    const slowest = results.reduce((a, b) => (a.ms > b.ms ? a : b));
    if (slowest.ms > 100) {
        await explainAnalyze(
            `${slowest.label} (${slowest.ms}ms)`,
            `SELECT id, "guestName", "checkIn", "checkOut", status FROM "Reservation" WHERE "hotelId" = $1 ORDER BY "checkIn" DESC LIMIT 50`,
            [hotelId]
        );
    }
}

// ── AuditLog archival helper (print SQL only — destructive) ────
function printArchivalSQL(): void {
    console.log(`
\n📦 AuditLog Archival (run manually when logs > 1M):
   ─────────────────────────────────────────────────────
   -- 1. Create archive table (one-time):
   CREATE TABLE IF NOT EXISTS "AuditLogArchive" AS SELECT * FROM "AuditLog" WHERE false;

   -- 2. Move records older than 1 year:
   INSERT INTO "AuditLogArchive" SELECT * FROM "AuditLog"
   WHERE "createdAt" < NOW() - INTERVAL '1 year';

   DELETE FROM "AuditLog" WHERE "createdAt" < NOW() - INTERVAL '1 year';

   -- 3. (Future) Partition by month for scale:
   -- PARTITION BY RANGE ("createdAt")
`);
}

// ── Entry point ───────────────────────────────────────────────
async function main() {
    console.log("🏨 Hotel SaaS — Performance Seed & Deep Benchmark");
    console.log("==================================================");
    console.log(`Target: ${RESERVATION_COUNT.toLocaleString()} reservations / ${(RESERVATION_COUNT * INVOICES_PER_RESERVATION).toLocaleString()} invoices / ${(RESERVATION_COUNT * AUDIT_PER_RESERVATION).toLocaleString()} audit logs\n`);

    const { id: hotelId } = await getOrCreateTestHotel();
    console.log(`Hotel: ${hotelId}`);

    await seedReservations(hotelId);
    await seedInvoices(hotelId);
    await seedAuditLogs(hotelId);

    await benchmark(hotelId);

    printArchivalSQL();

    console.log(`\n✅ Done! Benchmarks complete.`);
    console.log(`   To clean up: DELETE FROM "Reservation" WHERE "hotelId" = '${hotelId}'; -- cascades everything`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
