# StayOS Mobile KDS Operational Workflow

## 1. Flow Diagram
```
Kitchen Cook / Station
        │
        ▼
Live KDS Board (mobile/app/(app)/kitchen/index.tsx)
        │
        ├─► Auto-polls active tickets every 10 seconds
        │
        ├─► Order Card: Table / KOT Number, Elapsed Timer, Dishes & Bold Quantities, Notes
        │
        ├─► Tap "▶ Accept & Start Preparing" (PUT /api/pos/orders { status: 'Preparing' })
        │
        └─► Tap "✓ Mark Ready for Pickup" (PUT /api/pos/orders { status: 'Ready' })
                └─ Pass counter alert rendered in green
```
