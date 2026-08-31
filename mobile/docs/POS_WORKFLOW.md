# StayOS Mobile POS Operational Workflow

## 1. Flow Diagram
```
Restaurant Waiter / Server
        │
        ▼
Select Table / Room Service
        │
        ▼
Select Dishes & Enter Line Notes (mobile/app/(app)/restaurant/order.tsx)
        │
        ▼
Send Order & Dispatch KOT (POST /api/pos/orders)
        │
        ├─► Server checks Recipe Stock Availability (Atomic Transaction)
        ├─► Server computes Subtotal + 5% GST + Grand Total
        ├─► If Room Service -> Posts charge to Active In-House Folio
        └─► Dispatches KOT to Kitchen Queue
```
