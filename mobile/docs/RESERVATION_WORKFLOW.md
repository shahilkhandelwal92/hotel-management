# StayOS Mobile Reservation & Walk-In Workflow

## 1. Flow Diagram
```
Front Desk Operator
        │
        ├─► Search by Name / Phone / Ref ──► GET /api/reservations?search=...
        │
        ├─► Filter by Status ──────────────► GET /api/reservations?status=...
        │
        └─► Walk-In Booking Modal
                │
                ├─► Enter Guest Info + Dates + Room
                │
                ├─► POST /api/reservations
                │
                └─► Invalidate ['reservations'] ──► Redirect to Detail View
```

## 2. Invariants & Rules
* **Authoritative Pricing:** Rates, meal plans, and taxes are computed on server.
* **Auto-Assigned Blocks:** Room block dates are generated and saved in PostgreSQL atomic transactions.
* **Double-Tap Protection:** The submission button is disabled immediately upon trigger.
