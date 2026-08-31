# STAYOS — FINAL HOTEL OPERATIONS END-TO-END VERIFICATION

**Audit Date:** August 31, 2026  
**Scope:** Real-world 24-hour full multi-department operational simulation.

---

## 1. Chronological 24-Hour Operations Evidence

| Time | Department | Action & Flow | Business & Financial State | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **06:00** | Housekeeping | Morning linen stock audit | 300 total sheets tracked across in-rooms (50), in-linen-room (220), laundry (30). | **PASS** |
| **08:00** | Front Desk | Cashier shift opened with physical float | Shift opened with ₹5,000 float; expected cash initialized to ₹5,000. | **PASS** |
| **10:00** | Front Desk / VIP | VIP arrival, advance deposit & key issuance | ₹5,000 UPI advance deposit applied to ₹13,440 folio; folio balance reduced to ₹8,440; digital key issued. | **PASS** |
| **12:00** | F&B / Restaurant | Lunch dining order billed to room | POS meal charges posted to guest split folio window. | **PASS** |
| **14:00** | Front Desk / HK | Mid-stay room move (Room 201 -> 202) | Room 201 marked Dirty; Room 202 marked Occupied; housekeeping task dispatched; folio & digital keys preserved. | **PASS** |
| **15:00** | Housekeeping | Minibar consumption audit | 2x Sparkling Water (₹700) consumed; charge automatically posted to guest folio (Balance: ₹9,140). | **PASS** |
| **16:00** | Engineering | Corrective work order dispatch & resolution | Pool temperature sensor work order reported, assigned, completed, and closed with resolution notes. | **PASS** |
| **18:00** | Sales / Corporate | Corporate event billing to City Ledger (AR) | ₹45,000 banquet invoice posted to McKinsey AR account; account balance updated; credit limit validated. | **PASS** |
| **20:00** | Front Desk | Cashier shift closing & safe drop | Cash collected (₹15,000) - Drop (₹12,000) + Float (₹5,000) = ₹8,000 counted; Variance = ₹0; Shift closed. | **PASS** |
| **21:00** | Front Desk | Guaranteed reservation No-Show processing | No-show fee (₹3,000) assessed; reservation transitioned to NoShow; room inventory reopened for walk-ins. | **PASS** |
| **23:59** | Night Audit | Business day roll & revenue posting | Room charges posted, GST ledger updated, previous date locked, business date advanced to next operating day. | **PASS** |

---

## 2. Cross-Departmental Invariant Integrity

1. **Split Folios:** Sum of all 4 window balances equals total master folio balance.
2. **Cashier Shifts:** Expected Cash = Opening Float + Payments + Sales - Refunds - PaidOuts - Drops.
3. **Accounts Receivable:** AR Balance = Invoices - Payments + Adjustments.
4. **Accounts Payable:** 3-Way Match verified against PO total before invoice approval.
5. **Stores & Stock:** Requisition issuing and receiving conserves physical unit counts without negative balance drift.
