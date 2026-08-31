# StayOS Mobile Guest Check-In Workflow

## 1. Flow Diagram
```
Reservation Detail (Confirmed)
        │
        ▼
Press "Proceed to Guest Check-In"
        │
        ▼
Check-In Screen (mobile/app/(app)/reservations/check-in.tsx)
        │
        ├─► 1. Verify Guest Name & Contact Phone
        ├─► 2. Verify Room: Select from Available Vacant/Clean Rooms (GET /api/rooms)
        ├─► 3. Review Advance Deposit & Balance Due
        │
        ▼
Press "Confirm Check-In & Issue Key"
        │
        ▼
PUT /api/reservations/[id] { action: 'checkin' }
        │
        ├─► Room Status -> 'Occupied'
        ├─► Reservation Status -> 'CheckedIn'
        ├─► Key Issued via Lock Provider
        └─► Query Invalidation: ['reservations'], ['rooms-available'], ['folios']
```
