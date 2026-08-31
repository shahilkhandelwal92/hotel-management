# STAYOS — FINAL FINANCIAL RECONCILIATION & ARITHMETIC AUDIT

**Audit Date:** August 31, 2026  
**Scope:** Monetary calculations, double-entry bookkeeping, GST compliance, and cash drawer reconciliations.

---

## 1. Zero Floating-Point Currency Guarantee

- **Engine Standard:** Every monetary calculation utilizes `Prisma.Decimal` (mapped to PostgreSQL `NUMERIC(18, 2)` or `NUMERIC(18, 6)` for exchange rates).
- **Rounding Strategy:** Banking round (`toFixed(2)` / half-up round) applied strictly after tax and discount computation.
- **Evidence:** Tested with micro-cents ($0.01, 0.10, 0.3333) and large balances ($\ge 1,000,000,000,000.00$) in `decimalMoney.test.ts` and `deepAdversarialOperations.test.ts` with 0 drift.

---

## 2. Invariants & Balance Verification

1. **Double-Entry General Ledger:**
   $$\sum \text{Debits} \equiv \sum \text{Credits}$$
2. **Master Folio Conservation:**
   $$\text{Master Folio Balance} \equiv \sum_{w=1}^4 \text{Window}_w \text{ Balance}$$
3. **Cashier Float Equation:**
   $$\text{Expected Cash} = \text{Opening Float} + \text{Cash Payments} + \text{Cash Sales} - \text{Refunds} - \text{Paid Outs} - \text{Safe Drops}$$
4. **City Ledger (AR):**
   $$\text{AR Balance} = \sum \text{Invoices} - \sum \text{Payments} + \sum \text{Adjustments}$$
5. **Loyalty Ledger Invariant:**
   $$\text{Closing Points} = \text{Opening Points} + \text{Earned Points} - \text{Redeemed Points} - \text{Expired Points}$$

---

## 3. GST & Tax Invoicing

- **Gapless Sequence:** Sequential numbering `INV-YYYYMM-XXXX` guaranteed via PostgreSQL atomic row locks in `invoiceSequence.ts`.
- **Statutory GST Breakdown:** 6% CGST + 6% SGST (Intra-state) or 12%/18% IGST (Inter-state) calculated deterministically.
