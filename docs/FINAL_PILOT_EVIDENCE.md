# StayOS Final Pilot Acceptance Evidence Summary

## 1. Automated Regression & Business Day Suite Results
* **Backend Test Suites:** 55 passed, 55 total
* **Backend Tests:** 197 passed, 197 total (including `src/__tests__/controlledPilotValidation.test.ts`)
* **Mobile Test Suites:** 25 passed, 25 total
* **Mobile Tests:** 82 passed, 82 total
* **Total Automated Tests:** 279 passed, 279 total (100% PASS)

---

## 2. Invariant Proofs Recorded
1. **Financial Conservation:** Folio charges equal folio payments at zero-balance checkout (₹0.00 balance verified).
2. **Decimal Safety:** All monetary totals use exact server-side `Decimal(18, 2)` representations.
3. **Out-of-Order Isolation:** Maintenance work orders lock rooms into `Maintenance` status, preventing front desk booking, and release them to `Dirty` upon work order completion.
4. **Stock Movement Balance:** Store requisitions strictly conserve item counts between issuing and receiving departments.
5. **Night Audit Immutability:** Closed business dates cannot be backdated or modified without Super Admin authorization.
