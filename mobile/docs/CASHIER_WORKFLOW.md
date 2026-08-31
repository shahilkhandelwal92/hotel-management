# StayOS Mobile Cashier Operational Workflow

## 1. Flow Diagram
```
Cashier Operator
        │
        ├─► Open Shift (POST /api/finance/cashier)
        │       └─ Enter Opening Float (₹) + Terminal Name
        │
        ├─► Collect Folio Payments & Direct Cash Sales
        │       └─ Handled via Folio Settlement (POST /api/folio)
        │
        ├─► Record Mid-Day Cash Drop (POST /api/finance/cashier { action: 'LOG_TXN', type: 'DROP' })
        │       └─ Physical cash dropped into hotel drop-safe
        │
        ├─► Record Paid-Out (POST /api/finance/cashier { action: 'LOG_TXN', type: 'PAID_OUT' })
        │       └─ Petty cash disbursement with reason
        │
        └─► End-of-Shift Blind Count & Close (POST /api/finance/cashier { action: 'CLOSE' })
                ├─ Cashier enters Actual Counted Cash
                ├─ Server computes Variance
                └─ If Variance != 0, Managerial Approval is triggered
```
