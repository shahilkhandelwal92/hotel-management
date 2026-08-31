# STAYOS — FINAL APPROVAL & SEGREGATION OF DUTIES AUDIT

**Audit Date:** August 31, 2026  
**Auditor:** Principal Financial Auditor & Security Architect  
**Implementation Source:** `src/lib/approvalEngine.ts`, `src/lib/rbacHierarchy.ts`, `src/lib/cashierShiftEngine.ts`, `src/lib/apEngine.ts`

---

## 1. Approval Thresholds & Role Authority Matrix

| Action Type | Minimum Role Required | Approval Limit | Self-Approval Allowed | Timeout Safeguard | Escalation Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cashier Shortage / Variance** | `MANAGER` / `HOTEL_ADMIN` | $\le$ ₹25,000 (Manager), Unlimited (Admin) | **STRICT NO** (Rejects with 403) | 30s Interactive Tx | Hotel Admin $\rightarrow$ Owner |
| **Folio Balance Allowance / Comp** | `MANAGER` / `HOTEL_ADMIN` | $\le$ ₹10,000 (Manager), $\le$ ₹50,000 (Admin) | **STRICT NO** | 30s Interactive Tx | Hotel Admin $\rightarrow$ Owner |
| **PO Approval (Procurement)** | `HOTEL_ADMIN` / `OWNER` | $\le$ ₹100,000 (Admin), Unlimited (Owner) | **STRICT NO** | 30s Interactive Tx | Owner |
| **AP 3-Way Match Price Override** | `ACCOUNTING` / `HOTEL_ADMIN` | $\le$ ₹5,000 variance | **STRICT NO** | 30s Interactive Tx | Hotel Admin |
| **Overtime / Salary Revision** | `HR` / `HOTEL_ADMIN` | Policy bound | **STRICT NO** | 30s Interactive Tx | Hotel Admin |
| **Leave Approval** | `MANAGER` / `HR` | Standard Staff | **STRICT NO** | 30s Interactive Tx | HR Head |
| **Night Audit Day Reopen** | `HOTEL_ADMIN` / `OWNER` | Post-Roll Correction | **STRICT NO** | 30s Interactive Tx | Owner |

---

## 2. Segregation of Duties Proof

1. **Cashier Cannot Approve Shortage:** Verified in `humanErrorSimulation.test.ts` (attempt by cashier actor rejects with `User does not have required role`).
2. **Accountant Cannot Approve Self-Created AP:** Verified in `deepAdversarialOperations.test.ts`.
3. **Housekeeper Cannot Access Financial Transactions:** Verified in `rbacMatrix.test.ts`.
