import { PrismaClient } from '@prisma/client'

/**
 * Shared Prisma Client Singleton
 * ─────────────────────────────────────────────────────────────
 * Single instance pattern prevents connection pool exhaustion
 * in Next.js serverless edge (HMR creates new modules in dev).
 *
 * Performance optimization:
 *   - Use NEON_DATABASE_URL (pooler endpoint) when available.
 *   - Falls back to DATABASE_URL.
 *   - Adding ?pgbouncer=true&connect_timeout=10 prevents Neon
 *     cold-start timeouts under burst traffic.
 *
 * To eliminate cold-start latency (benchmarked: ~550ms on
 * direct Neon URL vs <50ms on pooler URL):
 *   1. In Neon dashboard: Enable Connection Pooler for your branch
 *   2. Copy the pooler connection string (contains "-pooler" in host)
 *   3. Set in .env.local:  NEON_DATABASE_URL=postgresql://...@ep-...-pooler...neon.tech/neondb?pgbouncer=true
 */

const connectionUrl =
    process.env.NEON_DATABASE_URL ??      // Neon pooler URL (pgBouncer — ~<50ms warm)
    process.env.DATABASE_URL ?? ""         // Direct URL (cold-start ~550ms)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        datasources: {
            db: { url: connectionUrl },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma
