/**
 * Atomic Invoice Sequence Generator
 * ──────────────────────────────────────────────────────────────────────
 * Database-backed concurrency-safe sequence generator for GST tax invoices.
 * Eliminates race conditions and duplicate invoice numbers.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface InvoiceNumberOptions {
    hotelId: string;
    financialYear?: string;
    prefix?: string;
    tx?: Prisma.TransactionClient | PrismaClient;
}

/**
 * Determine the Indian financial year string (e.g., "2025-26" or "2026-27").
 */
export function getFinancialYearString(date: Date = new Date()): string {
    const currentYear = date.getFullYear();
    const isPreApril = date.getMonth() < 3; // Jan, Feb, Mar belong to previous start year
    const startYear = isPreApril ? currentYear - 1 : currentYear;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
}

/**
 * Atomically generates the next consecutive invoice number for a given property and financial year.
 * Format: {prefix}/{FY}/{padded-seq} e.g. "INV/2025-26/0001"
 */
export async function generateNextInvoiceNumber(options: InvoiceNumberOptions): Promise<string> {
    const client = options.tx || prisma;
    const fy = options.financialYear || getFinancialYearString();
    const prefix = options.prefix || "INV";

    // Atomically upsert and increment nextNumber
    const seq = await client.invoiceSequence.upsert({
        where: {
            hotelId_financialYear_prefix: {
                hotelId: options.hotelId,
                financialYear: fy,
                prefix,
            },
        },
        create: {
            hotelId: options.hotelId,
            financialYear: fy,
            prefix,
            nextNumber: 2, // 1 used for current call
        },
        update: {
            nextNumber: { increment: 1 },
        },
    });

    // The allocated number is seq.nextNumber - 1 when incremented, or 1 on create
    // Since update returns value AFTER increment, allocated number is nextNumber - 1
    const allocatedNumber = seq.nextNumber - 1;
    const padded = String(allocatedNumber).padStart(4, "0");

    return `${prefix}/${fy}/${padded}`;
}
