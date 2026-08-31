# StayOS Mobile Folio, Split Windows & Checkout Workflow

## 1. Flow Diagram
```
Guest Folio View (mobile/app/(app)/folio/index.tsx)
        │
        ├─► 1. Big Balance Display (Zero balance = Green, Outstanding = Red)
        │
        ├─► 2. Split Folio Windows 1–4
        │       ├─ Window 1: Room & Tax
        │       ├─ Window 2: Incidentals & Minibar
        │       ├─ Window 3: Corporate Direct Bill
        │       └─ Window 4: Banquets & Events
        │
        ├─► 3. Post Transaction (POST /api/folio with mode: 'post_transaction')
        │       └─ Types: Payment, Charge, Adjustment, Refund
        │
        ├─► 4. Transfer Split Charge (POST /api/folio/split with action: 'TRANSFER_CHARGE')
        │
        └─► 5. Final Departure Checkout
                ├─ Verify Folio Balance is Settled (₹0.00)
                ├─ PUT /api/reservations/[id] { action: 'checkout' }
                ├─ PUT /api/folio { id, status: 'Closed' }
                └─ Room automatically marked 'Dirty' for Housekeeping Cleaning
```

## 2. Invariants
* **Non-Zero Folio Guard:** The backend rejects closing folios with non-zero balances (`422 Unprocessable Entity`).
* **Authoritative Totals:** No client calculations are trusted for accounting.
