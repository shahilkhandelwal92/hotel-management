# StayOS Mobile Store Transfer Operational Workflow

## 1. Flow Diagram
```
Department Requester (e.g. Housekeeping / Restaurant)
        │
        ▼
Create Transfer Requisition (mobile/app/(app)/inventory/create-transfer.tsx)
        ├─ Select Source Store & Destination Store
        ├─ Enter Item Name, Quantity, Unit
        └─ POST /api/stores/transfers (Status: REQUESTED)
        │
        ▼
Warehouse Storekeeper
        │
        ▼
Dispatch / Issue Transfer (POST /api/stores/transfers { action: 'ISSUE' })
        └─ Status transitions to IN_TRANSIT
        │
        ▼
Destination Department Storekeeper
        │
        ▼
Confirm Receipt (POST /api/stores/transfers { action: 'RECEIVE' })
        └─ Status transitions to RECEIVED
```
