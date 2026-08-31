# StayOS Mobile In-Stay Room Move Workflow

## 1. Flow Diagram
```
Active In-Stay Guest (Status: CheckedIn)
        │
        ▼
Press "Mid-Stay Room Move"
        │
        ▼
Room Move Screen (mobile/app/(app)/reservations/room-move.tsx)
        │
        ├─► Displays Current Occupied Room
        ├─► Fetches Available Vacant/Clean Target Rooms (GET /api/rooms)
        ├─► Operator Selects Target Room & Enters Audit Reason
        │
        ▼
POST /api/reservations/room-move
        │
        ▼
Server Transaction (src/lib/roomMoveEngine.ts):
        ├─► Releases old room blocks & sets Old Room to 'Dirty' (Housekeeping turnover scheduled)
        ├─► Creates new room blocks & sets New Room to 'Occupied'
        ├─► Reassigns digital key access credentials
        └─► Folio charges, guest CRM, and rate plans remain intact
```

## 2. Concurrency Protection
* **409 Conflict Handling:** If the target room changes availability concurrently, the mobile client displays an alert: *"Target room changed availability while booking. Refreshing room list..."* and automatically refetches the latest available rooms.
