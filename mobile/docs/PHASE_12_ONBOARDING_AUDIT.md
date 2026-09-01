# StayOS Phase 12 — Production Onboarding Audit

## 1. Executive Summary
This audit inspects the current StayOS platform for complete, programmatic onboarding of a brand-new hotel property through standard application APIs and administrative user interfaces without requiring direct database edits or developer assistance.

---

## 2. Onboarding Surface Audit

| Component / Entity | Backend API Endpoint | Admin UI Surface | Database Model | RBAC Access |
| :--- | :--- | :--- | :--- | :--- |
| **Hotel Property** | `POST /api/hotels` | `/admin/settings` | `Hotel` | `SUPER_ADMIN`, `OWNER` |
| **Tax Configuration** | `POST /api/tax-config` | `/admin/accounting/tax-config` | `TaxConfiguration` | `HOTEL_ADMIN`, `ACCOUNTING` |
| **Room Categories** | `POST /api/rate-plans` | `/admin/rate-plans` | `RoomCategory`, `RatePlan` | `HOTEL_ADMIN`, `MANAGER` |
| **Room Inventory** | `POST /api/rooms` | `/admin/dashboard` | `Room` | `HOTEL_ADMIN`, `MANAGER` |
| **Staff Accounts** | `POST /api/users` | `/admin/users` | `User`, `UserRole` | `HOTEL_ADMIN`, `HR` |
| **Stores & Warehouses**| `POST /api/stores/transfers` | `/admin/inventory` | `InventoryStore` | `HOTEL_ADMIN`, `STOREKEEPER` |
| **Menu & Recipes** | `POST /api/menu` | `/admin/dashboard` | `MenuItem`, `RecipeIngredient` | `HOTEL_ADMIN`, `FNB_MANAGER` |
| **Cashier Drawers** | `POST /api/finance/cashier`| `/admin/billing/folio` | `CashierShift` | `HOTEL_ADMIN`, `CASHIER` |
| **Engineering Assets** | `POST /api/maintenance/assets`| `/admin/dashboard` | `MaintenanceAsset` | `HOTEL_ADMIN`, `TECHNICIAN` |

---

## 3. Invariants & Security
* **Zero SQL Requirement:** All property, room, rate, tax, and user onboarding operates through validated REST endpoints and administrative dashboards.
* **Tenant Isolation:** Every created record is scoped strictly by `hotelId` with database foreign-key cascade protections.
* **Hardware KeyStore Protection:** Mobile tokens remain hardware-backed via `expo-secure-store`.
