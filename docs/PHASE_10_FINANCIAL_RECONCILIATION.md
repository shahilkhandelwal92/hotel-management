# StayOS Phase 10 Daily Financial & Cashier Reconciliation

## 1. Folio Mathematical Balance Invariant
For every guest folio $F$:
$$\text{Balance}(F) = \sum \text{Charges} - \sum \text{Payments} - \sum \text{Credits}$$

At checkout:
$$\text{Balance}(F) = ₹0.00$$

* All monetary computations are performed strictly in server-side `Prisma.Decimal(18, 2)` arithmetic.
* Unsettled folios (Balance $> 0$) are rejected at checkout with `422 Unprocessable Entity`.

---

## 2. Cashier Shift Reconciliation Formula
$$\text{Expected Cash} = \text{Opening Float} + \text{Cash Collections} + \text{Cash Sales} - \text{Paid Outs} - \text{Safe Drops}$$
$$\text{Variance} = \text{Physical Count} - \text{Expected Cash}$$

* Any variance ($\text{Variance} \neq 0$) requires explicit managerial approval; self-approval by cashiers is blocked server-side with `403 Forbidden`.
