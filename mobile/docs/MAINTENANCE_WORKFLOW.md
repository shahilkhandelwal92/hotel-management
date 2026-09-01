# StayOS Mobile Maintenance Operational Workflow

## 1. Flow Diagram
```
Technician / Maintenance Operator
        │
        ├─► View Plant Assets & Preventive Schedules
        │       └─ GET /api/maintenance/assets
        │
        ├─► Create Corrective Work Order
        │       ├─ Title, Description, Priority
        │       ├─ Associate Asset (Optional)
        │       ├─ Associate Room & OOO Lock (Optional)
        │       └─ POST /api/maintenance/assets { action: 'CREATE_WORK_ORDER' }
        │
        ├─► Start Work
        │       └─ POST /api/maintenance/assets { action: 'UPDATE_WORK_ORDER', status: 'IN_PROGRESS' }
        │
        ├─► Log Replacement Parts Consumed
        │       └─ POST /api/maintenance/assets { action: 'ADD_PART', partName, quantity, unitCost }
        │
        └─► Complete Work Order & Release Room
                ├─ Enter resolution remarks
                ├─ POST /api/maintenance/assets { action: 'COMPLETE_WORK_ORDER' }
                └─ Room released to 'Dirty' for Housekeeping inspection
```
