# StayOS: Enterprise Hotel Management & SaaS Platform
## Comprehensive Architecture, Role-Based Access Control (RBAC), System Flows & Functional Capabilities

---

## 1. Executive Summary & Technology Stack

**StayOS** is a cloud-native, multi-property Hotel Management SaaS and Property Management System (PMS) tailored for hospitality enterprises and independent boutique hotels, with native compliance for the **Indian Hospitality & Tax Ecosystem (GST/HSN/SAC/PF/ESI)**.

The system combines Front-Desk PMS, Contactless Guest Self-Service, Point of Sale (POS), Housekeeping Operations, B2B Corporate Event Management, Dynamic Rate Engine, greytHR-style Payroll/HR, Night Audit, and IoT Smart Access control into a unified, multi-tenant web and mobile platform.

### Technology Stack Overview

| Layer | Technologies & Frameworks | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 / 16 (App Router), React 19 | Server-Side Rendering (SSR), Client Components, Server Actions |
| **Styling & Design System** | Vanilla CSS + CSS Modules + Glassmorphism | Custom CSS variable design system, responsive layouts, theme customizer |
| **Mobile Integration** | Capacitor 8 (`@capacitor/android`, `@capacitor/core`) | Native Android build wrapper with web asset bridging |
| **Database & ORM** | PostgreSQL (Neon DB / Supabase compatible) via Prisma ORM 6.4 | Type-safe queries, connection pooling, multi-tenant relational schema |
| **Authentication & Security** | `jose` (JWT), `bcryptjs`, Custom Middleware | Stateless token auth, HMAC signature verification, IP rate-limiting |
| **PDF Generation** | `pdfmake` | Dynamic server-side GST tax invoice, BEO, and Folio PDF rendering |
| **Internationalization** | `next-intl` | Multi-language support (English `en`, Hindi `hi`) |
| **Auditing & Logging** | Winston Logger + Relational Audit Trails | Structured JSON logging, IP/User-Agent tracking, field-level diffs |

---

## 2. Access Roles, IAM & Permissions Matrix

### 2.1 System Roles Hierarchy

StayOS defines 12 distinct user roles spanning global SaaS administration, property-level management, departmental staff, and external partners/guests:

```
                               ┌─────────────────────────┐
                               │   SUPER_ADMIN / OWNER   │ (Platform / SaaS Level)
                               └────────────┬────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │                                             │
          ┌─────────────────────┐                       ┌─────────────────────┐
          │     HOTEL_ADMIN     │                       │     CORPORATE       │ (B2B Partner Portal)
          └──────────┬──────────┘                       └─────────────────────┘
                     │
    ┌────────────────┼────────────────┬────────────────┬────────────────┐
    │                │                │                │                │
┌───────┐      ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ STAFF │      │ACCOUNTING │    │    HR     │    │  KITCHEN  │    │HOUSEKEEPER│
│(Front)│      │ (Finance) │    │(PeopleOps)│    │(F&B / POS)│    │(Operations│
└───────┘      └───────────┘    └───────────┘    └───────────┘    └───────────┘
```

1. **`SUPER_ADMIN` / `OWNER`**: Global SaaS platform administrator with unrestricted access across all onboarded hotel properties, SaaS billing, telemetry, hotel onboarding, and database maintenance.
2. **`HOTEL_ADMIN` / `ADMIN`**: General Manager or Property Owner managing a specific hotel property. Controls property inventory, rates, staff, CRM, reports, and settings.
3. **`STAFF` / `FRONT_DESK`**: Front-office receptionist managing day-to-day reservations, guest check-ins/check-outs, room allocation, walk-ins, and guest requests.
4. **`ACCOUNTING`**: Finance and Accounts Manager with dedicated access to Invoices, Tax Configurations, Folios, GST reports, P&L Analytics, and Night Audit reviews.
5. **`HR` / `PEOPLE_OPS`**: Human Resources Manager overseeing employee profiles, biometric/QR attendance, leave approvals, salary revisions, overtime, and greytHR-style payroll processing.
6. **`KITCHEN` / `RESTAURANT` / `FNB_MANAGER`**: Food & Beverage team managing restaurant menus, kitchen grocery stock, KOT (Kitchen Order Tickets), and POS billing.
7. **`HOUSEKEEPING`**: Operations staff managing daily room cleaning statuses, inspection checklists, room turnover, and Lost & Found logging.
8. **`CORPORATE`**: B2B Corporate Partner who can access their dedicated portal to view event details, upload guest rosters, download passes, and track attendee check-in stats.
9. **`GUEST`**: Transient or residential hotel guest accessing the contactless mobile web portal for room key access, dining orders, amenity bookings, and express check-out.

---

### 2.2 Granular Permissions Matrix

| Permission Name | Super Admin / Owner | Hotel Admin | Front Desk / Staff | Accounting | HR | Kitchen / F&B | Housekeeping | Corporate Partner | Guest |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`MANAGE_BOOKINGS`** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_INVENTORY`** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_HOUSEKEEPING`**| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **`MANAGE_EVENTS`** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ *(Own)* | ❌ |
| **`VIEW_FINANCIALS`** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_SETTINGS`** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_POS`** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **`MANAGE_HR`** | ✅ | ✅ | ❌ | ✅ *(Payroll)* | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_GUESTS`** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`MANAGE_STAFF`** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 2.3 Portal & Route Guarding Architecture

Authentication and route isolation are enforced at two distinct security perimeters:

1. **Edge Middleware Guard (`src/middleware.ts`)**:
   - Validates the encrypted HTTP-only `session` JWT cookie.
   - Rejects unauthorized cross-tenant requests.
   - **Critical Security Feature:** Strips incoming client-sent headers (`x-hotel-id`, `x-user-id`, `x-user-role`) and overwrites them with authoritative, cryptographically verified values from the JWT payload.
   - Performs IP-based sliding-window rate limiting (60 req/min for public routes, 300 req/min for general API, and strict 20 req/min for `/api/auth/login`).
   - Implements exponential backoff IP blacklisting on repeated failed authentication attempts (10 fails = 5m, 15 fails = 30m, 20+ fails = 24h block).

2. **Route Authorization & Tenant Guard (`src/lib/tenantGuard.ts` & `src/lib/apiAccess.ts`)**:
   - `assertTenant(session, requestedHotelId)` ensures hotel staff cannot query, modify, or leak records belonging to another property ID.
   - Role-based redirection redirects authenticated users to their specific workspace dashboard:
     - `SUPER_ADMIN` / `OWNER` $\rightarrow$ `/admin/dashboard`
     - `ACCOUNTING` $\rightarrow$ `/admin/reports/analytics`
     - `HOTEL_ADMIN` $\rightarrow$ `/admin/reservations`
     - `KITCHEN` / `FNB_MANAGER` $\rightarrow$ `/restaurant/orders`
     - `CORPORATE` $\rightarrow$ `/corporate/dashboard`
     - `STAFF` / `HOUSEKEEPING` $\rightarrow$ `/staff/dashboard`

---

## 3. End-to-End System Flows & User Journeys

```
               ┌───────────────────────────────────────────────────────────┐
               │                    GUEST USER JOURNEY                     │
               └─────────────────────────────┬─────────────────────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            │                                │                                │
  [1. Online / Walk-in]            [2. Contactless In-Stay]         [3. Express Check-out]
  • Room Selection                 • Mobile Digital Key (QR)        • Real-time Folio Review
  • Instant Rate Calculation       • F&B In-Room Dining Order       • Multi-payment (UPI/Card)
  • Advance Deposit & Lock         • Housekeeping Extra Requests    • Instant GST Tax Invoice
  • CRM Profile Sync               • Amenity Slot Booking (Spa/Gym) • Room status → "Dirty"
```

### 3.1 Flow A: Guest Lifecycle (Reservation $\rightarrow$ Stay $\rightarrow$ Express Checkout)
1. **Booking & Overbooking Lock**: The guest books via front-desk or web portal. The system creates an atomic transaction creating the `Reservation`, creating daily `RoomBlock` entries to prevent overbooking, and initializing an open `Folio`.
2. **Contactless Check-In**: Upon arrival, the guest accesses `/guest?bookingRef=...`. The system assigns an active `AccessCredential` (Digital QR Key) and transitions the room status to `Occupied`.
3. **In-Stay Orders & Requests**:
   - F&B orders placed via `/guest/dining` automatically generate a `PosOrder` and post charges to the guest's `Folio`.
   - Special requests (e.g., Extra Bed, Housekeeping) route to `/api/guest/requests` for staff dispatch.
   - Amenity bookings (Spa, Gym slots) create `AmenityBooking` with custom slot validation.
4. **Express Check-Out & Billing**: Guest opens `/guest/checkout`, reviews real-time itemized folio charges, settles the balance, and downloads the official GST Tax Invoice PDF. The room automatically flips to `Dirty` in Housekeeping.

---

```
               ┌───────────────────────────────────────────────────────────┐
               │                  RESTAURANT & POS FLOW                    │
               └─────────────────────────────┬─────────────────────────────┘
                                             │
      ┌──────────────────────────────┬───────┴──────────────────────┬──────────────────────────────┐
      │                              │                              │                              │
[Order Placement]            [Kitchen KOT Dispatch]         [Stock Movement]               [Folio Posting]
• Table / Room / Walkin      • Ticket printed/screened      • Recipe ingredients deducted  • Charged to Folio
• Veg/Spice Customization    • Status: Preparing → Ready    • Low stock alert trigger      • Or settled at POS
```

### 3.2 Flow B: Restaurant & F&B POS Workflow
1. **Order Capture**: F&B staff or guest selects menu items (categorized with Veg/Non-Veg, Spice levels) for Table, Room Service, or Walk-in.
2. **KOT Generation**: A Kitchen Order Ticket (KOT) is generated and dispatched to the kitchen dashboard (`/restaurant/orders`).
3. **Inventory Auto-Deduction**: Ingredient stock is recorded via `GroceryStockMovement`. If stock drops below `minAlert`, a notification is displayed.
4. **Settlement**: Order can be settled immediately (Cash/Card/UPI) or billed directly to the guest's room `Folio`.

---

```
               ┌───────────────────────────────────────────────────────────┐
               │              CORPORATE B2B & EVENT MANAGEMENT             │
               └─────────────────────────────┬─────────────────────────────┘
                                             │
      ┌──────────────────────────────┼──────────────────────────────┐
      │                              │                              │
[1. Event Booking]            [2. Attendee Roster]           [3. Event Day Execution]
• Venue Selection (Banquet)    • Bulk CSV/Excel Guest Import  • QR Scanner Gate Verification
• Date & Capacity Lock         • Unique QR Passes Generated   • Real-time Attendance Analytics
• Catering & Room Packages     • Automated WhatsApp/Email     • BEO & Master Tax Invoice
```

### 3.3 Flow C: Corporate Events & Banquet Management
1. **Venue Reservation**: Banquet Hall or Lawn is booked via `/admin/venues` or `/book-event`, specifying event dates, guest count, decoration charges, and catering rates per person.
2. **Roster Onboarding**: Corporate event manager logs in via `/corporate/[eventId]` with a unique corporate access code and imports attendee lists.
3. **QR Pass Issuance & Scanning**: Each guest receives a unique QR code. On event day, venue staff use `/admin/events/scanner` to scan and verify entries in sub-second real-time.
4. **Banquet Event Order (BEO) & Settlement**: Generates comprehensive BEO documents and consolidated corporate tax invoices.

---

```
               ┌───────────────────────────────────────────────────────────┐
               │           NIGHT AUDIT & FINANCIAL CLOSING FLOW            │
               └─────────────────────────────┬─────────────────────────────┘
                                             │
      ┌──────────────────────────────┼──────────────────────────────┐
      │                              │                              │
[1. Verification]             [2. Auto-Posting]              [3. Day Lock]
• Pending check-ins/outs       • Room charges to Folios       • Audit locked (isDayClosed: true)
• Open KOTs and orders         • Tax & Amenity accruals       • Snapshots revenue & occupancy
• Unbalanced guest folios      • Occupancy calculation        • Rollover to new business date
```

### 3.4 Flow D: Night Audit & Daily Financial Closing
1. **Pre-Audit Validation**: Audits open folios, pending arrivals, unclosed restaurant orders, and room statuses.
2. **Automated Revenue Posting**: Automatically calculates and posts daily room tariff and taxes across all occupied rooms to their respective guest folios.
3. **Audit Closure**: Generates a tamper-evident `NightAudit` snapshot containing room revenue, F&B revenue, amenity revenue, total taxes, and occupancy percentage. Locks past transactions from unauthorized backdated edits.

---

## 4. Complete Module Breakdown

### 4.1 PMS (Property Management System)
- **Room Inventory (`/admin/inventory`)**: Manage physical rooms, floors, categories (Deluxe, Suite, Standard), occupancy limits, base rates, and maintenance flags.
- **Reservations Hub (`/admin/reservations`)**: Calendar grid, timeline view, walk-in creation, date modifications, cancellations, and check-in/out processing.
- **Overbooking Prevention**: Unique database index on `[roomId, date]` in `RoomBlock` prevents double-booking across concurrent front-desk and web transactions.

### 4.2 Rate Plans & Dynamic Pricing Engine (`/admin/rate-plans`)
- **Rate Plans**: Create customizable rate plans (e.g., Room Only `RO`, Continental Plan `CP`, Modified American Plan `MAP`, American Plan `AP`, OTA, Corporate).
- **Dynamic Rules & Seasonal Multipliers**: Apply rule multipliers for Weekends, Minimum Length of Stay (MinStay), Early Bird bookings, and high-demand festive seasons (e.g., Diwali Peak, New Year).

### 4.3 Folio & Guest Ledger Engine (`/admin/billing/folio`)
- **Running Ledger**: Real-time balance ledger tracking every debit (Room Tariff, In-Room Dining, Spa, Laundry) and credit (Advance Deposit, UPI payment, Cash settlement).
- **Folio Operations**: Supports folio splits (Personal vs Corporate Company folio), room-to-room charge transfers, and balance reconciliation before checkout.

### 4.4 Indian GST Billing & Invoicing Engine (`/admin/billing/invoices`)
- **State-Wise GST Determination**: Automatically computes **CGST (50%) + SGST (50%)** for intra-state guests or **IGST (100%)** for inter-state guests based on hotel state vs guest state.
- **Multi-Tier HSN/SAC Tax Support**: Handles standard SAC codes for accommodation (`996311`), restaurant dining (`996331`), and spa/wellness services.
- **B2B Invoicing**: Validates corporate GSTIN, captures company state, and generates B2B tax invoices and credit/debit notes.
- **PDF Generation**: Generates compliant downloadable PDF tax invoices via `pdfmake`.

### 4.5 Restaurant Point of Sale (POS) & KDS (`/restaurant/orders`)
- **Table & Room Service POS**: Real-time order creation interface for captains and waitstaff.
- **Kitchen Display System (KDS)**: Order lifecycle tracking (`Pending` $\rightarrow$ `Preparing` $\rightarrow$ `Ready` $\rightarrow$ `Delivered`).
- **Kitchen Order Ticket (KOT)**: Print-ready KOT formatting with item-level special cooking instructions.

### 4.6 Grocery & Inventory Stock Control (`/restaurant/stock`)
- **Kitchen Inventory**: Tracks raw grocery items (vegetables, dairy, grains, beverages) with unit-of-measure tracking (kg, L, packets).
- **Stock Movement Ledger**: Records every stock inward (`IN`), consumption (`OUT`), and manual correction (`ADJUST`).
- **Low Stock Threshold Alerts**: Visual indicators when items drop below pre-configured safety stock levels (`minAlert`).

### 4.7 Housekeeping & Lost and Found (`/admin/housekeeping`)
- **Task Dispatch**: Auto-assigns cleaning, turndown, deep clean, and inspection tasks to housekeeping staff.
- **Digital Inspection Checklists**: Housekeepers complete JSON-backed checklists on mobile before marking rooms as clean.
- **Lost & Found Registry (`/admin/housekeeping/lost-found`)**: Logs found items with photos/descriptions, finder name, location, guest claims, and resolution history.

### 4.8 Corporate Events, Venues & Banqueting (`/admin/events`, `/admin/venues`)
- **Venue Master**: Configure banquets, conference halls, poolside lawns, capacities, and base rental charges.
- **B2B Corporate Portal (`/corporate/[eventId]`)**: Whitelabeled interface for corporate event organizers to upload guest manifests and monitor attendance.
- **High-Speed QR Scanner (`/admin/events/scanner`)**: Camera-based QR ticket scanner for event gates with real-time pass validation.

### 4.9 Guest CRM & Loyalty Engine (`/admin/crm/guests`)
- **Guest Profiles**: Stores historical guest data, preferences (e.g., high floor, feather pillow, vegan), anniversary/birthdays, and ID document numbers.
- **Loyalty Points Ledger**: Tracks point earnings and redemptions with automatic tier upgrades (Silver, Gold, Platinum).
- **Guest Complaints Desk**: Ticketing system for service issues across departments with priority resolution tracking.

### 4.10 greytHR-style Payroll & Statutory Tax Engine (`/admin/payroll`)
- **Salary Architecture**: Calculates Gross Salary (Basic, HRA, Conveyance, Medical, Overtime, Bonuses) and Net Salary.
- **Indian Statutory Compliance**:
  - **Provident Fund (PF)**: Computes statutory 12% employee contribution.
  - **Employee State Insurance (ESI)**: Computes 0.75% contribution for eligible salary slabs.
  - **Professional Tax (PT)**: Applies state-specific monthly deduction slabs.
  - **TDS / Income Tax**: Deducts monthly income tax based on annual employee tax declarations.
- **Salary Revisions & Appraisals (`/admin/hr/settings`)**: Tracks performance ratings, hike percentages, and promotion history.

### 4.11 HR Attendance, Shift Rostering & Leave Management (`/admin/hr`)
- **Shift Management**: Configure shifts (Morning, Evening, Night) and roster employees onto a visual scheduling calendar.
- **Dynamic QR & Geofenced Attendance**: Staff clock in/out via dynamic QR codes with GPS latitude/longitude verification.
- **Leave Application & Approval**: Staff apply for Casual, Sick, or Earned leaves with multi-tier managerial approval workflows.

### 4.12 Smart Access & IoT Lock Provider HAL (`/admin/smart-access`)
- **Hardware Abstraction Layer (HAL)**: Pluggable architecture supporting `INTERNAL_QR`, `ASSA_ABLOY`, and `DORMAKABA` key providers.
- **Credential Issuance**: Issues timed QR and Mobile Keys valid strictly between check-in and check-out timestamps.
- **Access Logs & Security Telemetry**: Captures every unlock event, scanner timestamp, and denied access attempt.

### 4.13 SaaS Platform Management & Property Onboarding (`/admin/onboarding`, `/admin/subscriptions`)
- **Multi-Property Tenancy**: Supports multi-hotel portfolios under one account with seamless property switching via `HotelSwitcher`.
- **SaaS Subscription Plans**: Enforces tiered SaaS plans (Starter, Growth, Enterprise) with resource quota limits on rooms, users, and POS terminals.
- **CRM Leads Funnel**: Tracks new property onboarding leads from outreach to active subscription.

### 4.14 Enterprise Auditing & System Monitoring (`/admin/monitoring`, `/api/audit`)
- **Tamper-Evident Audit Trails**: Logs every sensitive operation (Invoice creation, Rate plan modification, Role change, User creation) with before/after JSON diffs.
- **Security Telemetry**: Records client IP addresses, User-Agent strings, and timestamped actions for fraud detection.

---

## 5. Directory & Codebase Architecture Map

```
hotel-management/
├── prisma/
│   └── schema.prisma           # 1,394-line relational schema (40+ models)
├── scripts/
│   ├── seed-client-logins.ts   # Seed script configuring default roles, users, & demo data
│   ├── seed-performance.ts     # High-volume stress testing data generator
│   └── prisma-env.mjs          # Multi-environment Prisma CLI loader
├── src/
│   ├── middleware.ts           # Edge security, JWT injection, and IP rate limiting
│   ├── i18n.ts                 # Next-intl configuration
│   ├── messages/               # Internationalization dictionaries (en.json, hi.json)
│   ├── lib/
│   │   ├── auth.ts             # JWT signing, verification, and password hashing
│   │   ├── apiAccess.ts        # Request role resolution & authorization helpers
│   │   ├── tenantGuard.ts      # Multi-tenant isolation & quota assertion
│   │   ├── invoice.ts          # GST calculation engine & tax aggregation
│   │   ├── audit.ts            # Audit logging pipeline
│   │   ├── prisma.ts           # Prisma Client singleton
│   │   └── locks/              # Smart lock hardware abstraction layer & mock providers
│   ├── components/             # Reusable UI library (Sidebar, ThemeCustomizer, HotelSwitcher)
│   └── app/
│       ├── page.tsx            # High-conversion public landing page
│       ├── login/              # Unified authentication portal
│       ├── admin/              # Full PMS & Back-Office suite (24 sub-modules)
│       ├── restaurant/         # Restaurant POS & KDS interface
│       ├── staff/              # Staff portal & operations dashboard
│       ├── corporate/          # B2B Corporate Partner event portal
│       ├── guest/              # Contactless guest self-service web app
│       ├── book-event/         # Public event & venue booking portal
│       ├── showcase/           # Interactive product capability showcase
│       ├── presentation/       # Stakeholder presentation slides
│       ├── developer/          # Developer guild & interactive architecture blueprint
│       └── api/                # 43+ REST API endpoints powering all platform functions
```

---

## 6. Key Capabilities & Technical Highlights

1. **Deterministic Concurrency & Zero Overbooking**: Employs atomic database transactions and strict database-level unique constraints on room dates, eliminating double-booking risks even under high traffic.
2. **Indian Statutory & GST Precision**: Complete state-aware GST engine with CGST/SGST/IGST breakdown, SAC/HSN cataloging, and automated PF/ESI/PT statutory payroll calculations.
3. **Multi-Tenant Header Isolation**: Middleware strips client-supplied tenant headers and authoritatively injects validated claims from JWT signatures, preventing IDOR (Insecure Direct Object Reference) vulnerabilities.
4. **Hardware-Agnostic Smart Access**: Modular Lock Provider interface enables seamless integration with commercial IoT door locks (ASSA ABLOY, Dormakaba) or native QR mobile keys.
5. **Mobile-First & Hybrid Ready**: Fully responsive interface paired with Capacitor 8 integration for Android deployment on staff POS tablets and guest mobile devices.
6. **Enterprise Resilience & Auditing**: Comprehensive audit logging, field-level diffs, session timeout management, and sliding-window rate limiting ensure high availability and compliance.
