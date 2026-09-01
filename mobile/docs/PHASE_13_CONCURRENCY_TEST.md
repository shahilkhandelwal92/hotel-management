# StayOS Phase 13 — Race Condition & Concurrency Safety

## 1. Safety Invariants Tested

| Workload Scenario | Safety Mechanism | Observed Behavior |
| :--- | :--- | :--- |
| **Simultaneous Room Booking** | Unique constraint / status check | 1 Success, 1 Rejection (409 Conflict) |
| **Simultaneous Check-In** | Atomic database transaction | Exactly 1 room allocated; second request fails |
| **Duplicate Payment Submission** | Server idempotency key (`referenceId`) | Exactly 1 financial debit/credit created |
| **Simultaneous Stock Deductions**| Atomic SQL decrement | Zero negative stock; conservation preserved |
| **Simultaneous Cashier Close** | Status validation in transaction | 1 Closed, 1 Rejected (409 Conflict) |
| **Simultaneous Night Audit** | Unique compound key `[hotelId, auditDate]` | Exactly 1 audit record created; duplicate rejected |
