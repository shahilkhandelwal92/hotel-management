# StayOS Mobile Backend Integration Map

Complete mapping of all StayOS backend API endpoints supporting the **StayOS Operations** Android mobile application.

---

## 1. Authentication & Tenant Identity

### `POST /api/auth/login`
* **Purpose:** Authenticate staff member.
* **Auth Requirement:** Public (Rate limited & IP blacklisted).
* **Request:**
  ```json
  { "email": "staff@hotel.com", "password": "..." }
  ```
* **Success (200 OK):**
  ```json
  {
    "success": true,
    "user": { "id": "usr_1", "email": "...", "name": "...", "roles": ["HOUSEKEEPING"], "hotelId": "htl_1" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Errors:** `400 Bad Request`, `401 Unauthorized`, `403 IP Blacklisted / No Assigned Role`, `500 Server Error`.

### `GET /api/auth/me`
* **Purpose:** Fetch authoritative user profile, active hotel property, and dynamic RBAC permissions list.
* **Auth Requirement:** Bearer Token / Cookie.
* **Success (200 OK):**
  ```json
  {
    "user": {
      "id": "usr_1",
      "email": "...",
      "name": "...",
      "hotelId": "htl_1",
      "hotel": { "id": "htl_1", "name": "Grand Palace", "location": "City Center" },
      "permissions": ["HOUSEKEEPING_VIEW", "HOUSEKEEPING_MANAGE", "ROOM_VIEW"],
      "hasMultipleHotels": false
    }
  }
  ```

### `POST /api/auth/logout`
* **Purpose:** Invalidate session.
* **Success (200 OK):** `{ "success": true }`

### `GET /api/auth/hotels` & `POST /api/auth/switch-hotel`
* **Purpose:** List authorized properties for multi-hotel users and switch the active session property.
* **Switch Request:** `{ "hotelId": "htl_2" }`
* **Switch Response (200 OK):** `{ "success": true, "user": { ... }, "token": "..." }`

---

## 2. Housekeeping Operations

### `GET /api/housekeeping`
* **Purpose:** Fetch room cleaning task board.
* **Permission:** `HOUSEKEEPING_VIEW`
* **Query Params:** `status`, `priority`, `roomId`
* **Success (200 OK):**
  ```json
  {
    "tasks": [
      {
        "id": "tsk_1",
        "roomNumber": "101",
        "taskType": "Clean",
        "priority": "High",
        "status": "Pending",
        "checklist": [{ "item": "Change bed sheets", "done": false }],
        "room": { "id": "rm_1", "number": "101", "type": "Deluxe", "floor": 1, "status": "Dirty" },
        "assignedTo": { "id": "usr_1", "name": "Staff A" }
      }
    ]
  }
  ```

### `POST /api/housekeeping`
* **Purpose:** Dispatch new cleaning / inspection task.
* **Permission:** `HOUSEKEEPING_MANAGE`
* **Request:**
  ```json
  { "roomId": "rm_1", "roomNumber": "101", "taskType": "Clean", "priority": "High", "assignedToId": "usr_1" }
  ```

### `PUT /api/housekeeping`
* **Purpose:** Update cleaning checklist and progress; mark room turnover completed.
* **Permission:** `HOUSEKEEPING_MANAGE`
* **Request:**
  ```json
  { "id": "tsk_1", "status": "Completed", "checklist": [{ "item": "Change bed sheets", "done": true }] }
  ```

### `GET/POST /api/housekeeping/lost-found`
* **Purpose:** View and record lost & found items left in guest rooms.
* **Permission:** `LOST_FOUND_VIEW` / `LOST_FOUND_MANAGE`

---

## 3. Front Desk & Reservations

### `GET /api/reservations`
* **Purpose:** Query arrivals, departures, and in-house guests.
* **Permission:** `RESERVATION_VIEW`
* **Query Params:** `status`, `checkIn`, `checkOut`, `search`

### `POST /api/reservations`
* **Purpose:** Create reservation / walk-in booking.
* **Permission:** `RESERVATION_CREATE`
* **Request:**
  ```json
  {
    "hotelId": "htl_1",
    "roomId": "rm_1",
    "guestName": "John Doe",
    "guestPhone": "+919876543210",
    "checkIn": "2026-09-01T14:00:00.000Z",
    "checkOut": "2026-09-03T11:00:00.000Z",
    "advanceDeposit": 2000
  }
  ```

### `PUT /api/reservations/[id]`
* **Purpose:** Perform action-specific front desk transitions (checkin, checkout, cancel, room update).
* **Permissions:** `RESERVATION_CHECKIN`, `RESERVATION_CHECKOUT`, `RESERVATION_CANCEL`, `RESERVATION_UPDATE`
* **Request:** `{ "action": "checkin" }` or `{ "action": "checkout" }`

### `POST /api/reservations/room-move`
* **Purpose:** Atomic in-stay room swap with room block reassignment.
* **Permission:** `RESERVATION_UPDATE`
* **Request:**
  ```json
  { "reservationId": "res_1", "targetRoomId": "rm_2", "reason": "AC maintenance" }
  ```

### `GET /api/rooms`
* **Purpose:** Live room grid and housekeeping status.
* **Permission:** `ROOM_VIEW`

---

## 4. Folios, Billing & Split Windows

### `GET /api/folio`
* **Purpose:** View reservation folios, posted room tariffs, POS charges, and payments.
* **Permission:** `FOLIO_VIEW`

### `GET /api/folio/split?folioId=...`
* **Purpose:** Fetch split folio windows (1 to 4) and itemized window allocations.
* **Permission:** `FOLIO_VIEW`

### `POST /api/folio/split`
* **Purpose:** Create window (`action: "CREATE_WINDOW"`) or transfer charge between windows (`action: "TRANSFER_CHARGE"`).
* **Permission:** `FOLIO_UPDATE` / `FOLIO_SPLIT`

---

## 5. Cashiering & Shift Reconciliation

### `GET /api/finance/cashier`
* **Purpose:** View recent cashier shifts and current shift status.
* **Permission:** `CASHIER_VIEW`

### `POST /api/finance/cashier`
* **Purpose:** Open shift, record cash drop (`LOG_TXN`), or perform blind close (`CLOSE`).
* **Permission:** `CASHIER_MANAGE`

---

## 6. Engineering & Maintenance

### `GET /api/maintenance/assets`
* **Purpose:** List assets and pending corrective work orders.
* **Permission:** `MAINTENANCE_VIEW`

### `POST /api/maintenance/assets`
* **Purpose:** Create maintenance work order or place room Out-Of-Order (OOO).
* **Permission:** `MAINTENANCE_MANAGE` / `WORK_ORDER_CREATE`

---

## 7. F&B POS & Kitchen Display System

### `GET /api/pos/orders` & `POST /api/pos/orders`
* **Purpose:** View restaurant table orders and submit new order with KOT dispatch.
* **Permission:** `VENUE_VIEW` / `VENUE_MANAGE`

### `GET /api/kitchen/stock`
* **Purpose:** Kitchen inventory balance view.
* **Permission:** `STORE_VIEW`

---

## 8. Stores & Inventory

### `GET /api/stores/transfers` & `POST /api/stores/transfers`
* **Purpose:** Create and track inter-department and inter-store stock transfers.
* **Permission:** `STORE_VIEW` / `STORE_TRANSFER`

---

## 9. Manager & Executive Overview

### `GET /api/analytics/executive-dashboard`
* **Purpose:** Real-time occupancy, ADR, RevPAR, and department throughput metrics.
* **Permission:** `REPORT_FINANCIAL` / `SUPER_ADMIN` / `HOTEL_ADMIN` / `MANAGER`

### `GET /api/approvals` & `POST /api/approvals`
* **Purpose:** Review and approve/reject cashier shortage variances and purchase requisitions.
* **Permission:** `APPROVAL_VIEW` / `APPROVAL_DECIDE`
