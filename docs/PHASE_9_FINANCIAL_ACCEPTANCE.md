# StayOS Phase 9 Guest Financial Acceptance & Exact Decimal Reconciliation

## 1. Pilot Guest Financial Reconciliation Ledger

| Transaction Description | Type | Debit (Charges) | Credit (Payments) | Running Folio Balance |
| :--- | :--- | :--- | :--- | :--- |
| **Opening Room Tariff (2 Nights)** | Charge | ₹9,000.00 | — | ₹9,000.00 |
| **Advance Check-In Deposit** | Payment | — | ₹4,000.00 | ₹5,000.00 |
| **Restaurant Dining (Table 4)** | Charge | ₹1,050.00 | — | ₹6,050.00 |
| **Minibar Consumption (Almonds)** | Charge | ₹500.00 | — | ₹6,550.00 |
| **Final Checkout Settlement** | Payment | — | ₹6,550.00 | **₹0.00** |

---

## 2. Invariant Proofs
* **Total Charges:** ₹10,550.00
* **Total Payments:** ₹10,550.00
* **Closing Balance:** ₹0.00 (Zero-balance checkout successfully executed)
* **Unexplained Discrepancies:** ₹0.00
* **Arithmetic Precision:** `Prisma.Decimal(18, 2)` exact arithmetic across all transactions.
