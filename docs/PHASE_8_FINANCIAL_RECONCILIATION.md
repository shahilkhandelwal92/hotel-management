# StayOS Phase 8 Financial Reconciliation Audit

## 1. Reconciliation Invariant Proof
At checkout, every guest folio must balance to exact zero:
$$\text{Opening Balance} + \sum \text{Charges} - \sum \text{Credits} - \sum \text{Payments} = ₹0.00$$

* All arithmetic is calculated using `Prisma.Decimal(18, 2)` to eliminate floating-point drift.
* Advance deposits correctly post as ledger credits to Window 1.
* Cashier physical cash counts are reconciled with shift float, cash collections, safe drops, and paid-outs with strict variance approval.
