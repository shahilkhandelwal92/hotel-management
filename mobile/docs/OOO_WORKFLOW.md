# StayOS Mobile Out-of-Order (OOO) Room Workflow

## 1. Flow Diagram
```
Room Failure Reported (e.g. Major Leakage / AC Breakdown)
        │
        ▼
Technician creates Work Order with "Lock Room Out-of-Order"
        │
        ▼
Server Transaction (src/lib/maintenanceEngine.ts):
        ├─ Creates Work Order record in database
        ├─ Atomically updates Room status to 'Maintenance'
        └─ Blocks Front Desk reservation room assignment
        │
        ▼
Repairs Completed by Engineering
        │
        ▼
Technician taps "Complete & Release Work Order"
        │
        ▼
Server Transaction:
        ├─ Work Order status updated to 'COMPLETED'
        ├─ Room status automatically transitioned to 'Dirty'
        └─ Housekeeping alerted on Room Board to clean & inspect
```
