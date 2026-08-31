/**
 * prismaMiddleware.ts
 * ──────────────────────────────────────────────────────────────────────
 * Global Prisma client with soft-delete middleware.
 *
 * Usage: import prismaDb from "@/lib/prismaMiddleware"
 * instead of "new PrismaClient()" in API routes that
 * need automatic soft-delete filtering.
 *
 * Models with soft delete: Reservation, Invoice
 */

import prisma from "@/lib/prisma";

const SOFT_DELETE_MODELS = ["Reservation", "Invoice"];

const SOFT_DELETE_OPERATIONS = [
    "findFirst",
    "findMany",
    "findUnique",
    "count",
    "aggregate",
    "groupBy",
];

// Apply soft-delete middleware to the SHARED singleton
// Note: $use is additive — safe to call once at module load
(prisma as any).$use(async (params: any, next: any) => {
    // Auto-filter soft-deleted records
    if (
        SOFT_DELETE_MODELS.includes(params.model) &&
        SOFT_DELETE_OPERATIONS.includes(params.action)
    ) {
        if (!params.args?.where?.deletedAt) {
            if (!params.args) params.args = {};
            if (!params.args.where) params.args.where = {};
            params.args.where.deletedAt = null;
        }
    }

    // Turn delete → update { deletedAt: now }
    if (SOFT_DELETE_MODELS.includes(params.model) && params.action === "delete") {
        params.action = "update";
        if (!params.args) params.args = {};
        if (!params.args.data) params.args.data = {};
        params.args.data.deletedAt = new Date();
    }

    // Turn deleteMany → updateMany { deletedAt: now }
    if (SOFT_DELETE_MODELS.includes(params.model) && params.action === "deleteMany") {
        params.action = "updateMany";
        if (!params.args) params.args = {};
        if (!params.args.data) params.args.data = {};
        params.args.data.deletedAt = new Date();
    }

    return next(params);
});

// Export the singleton (with middleware now registered)
const prismaDb = prisma;
export default prismaDb;

/**
 * Explicitly include soft-deleted records in a query.
 * Usage: prismaDb.invoice.findMany({ where: { ...withDeleted() } })
 */
export function withDeleted() {
    return { deletedAt: undefined };
}

/**
 * Hard-delete a record (bypasses soft-delete middleware).
 * Only for admin/cleanup use.
 */
export async function hardDelete(
    model: "reservation" | "invoice",
    id: string
) {
    return (prismaDb as any)[model].delete({ where: { id } });
}
