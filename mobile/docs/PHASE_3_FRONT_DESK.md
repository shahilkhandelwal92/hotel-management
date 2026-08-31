# StayOS Mobile Operations — Phase 3 Front Desk Specification

## 1. Scope & Overview
Phase 3 expands the official StayOS Android application (`com.stayos.operations`) to include core Front Desk reception, reservation lifecycle management, guest check-in, in-stay room moves, folios, split windows 1–4, and departure checkout.

---

## 2. Architecture & Authoritative Roles
* **Frontend Mobile Client:** Responsible only for presentation, user interaction, secure credential vaulting, and server-state caching.
* **StayOS Backend Server:** Authoritative single source of truth for:
  - Reservation states (`Confirmed`, `CheckedIn`, `CheckedOut`, `Cancelled`, `NoShow`)
  - Room turnover states (`Vacant`, `Clean`, `Dirty`, `Occupied`, `Maintenance`)
  - Financial calculations, GST tax calculations, and payments allocation
  - In-stay atomic room block transitions
  - Split Folio window ledger rules and closing invariants

---

## 3. Screen Structure
```
mobile/app/(app)/
├── dashboard.tsx                   # Operations Grid (Housekeeping + Front Desk)
├── reservations/
│   ├── index.tsx                   # Live Arrivals/Departures/In-House + Walk-in Booking
│   ├── details.tsx                 # Full Booking Dossier & Status Action Triggers
│   ├── check-in.tsx                # Room Assignment Verification & Key Issuance
│   └── room-move.tsx               # Atomic In-Stay Physical Room Move
└── folio/
    └── index.tsx                   # 4-Window Split Folio, Line-Item Ledger, Checkout
```
