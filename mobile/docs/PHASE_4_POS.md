# StayOS Mobile Restaurant POS Specification

## 1. Scope & Overview
Provides mobile table management, menu item browsing, quantity controls, KOT printing, and room service folio charging for restaurant and room service staff.

---

## 2. Inventory & Stock Conservation Invariant
* Every dish in `POST /api/pos/orders` links to recipes (`recipeIngredients`) in the backend database.
* The backend atomically decrements `groceryStock` and creates `groceryStockMovement` audit records (`movementType: 'OUT'`).
* If ingredients are insufficient, the server rejects the order with `409 Conflict` and reports the exact depleted ingredient and quantity.
* Client-side never performs duplicate stock deductions.
