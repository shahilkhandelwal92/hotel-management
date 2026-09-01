# StayOS Mobile Stores & Inventory Specification

## 1. Scope & Overview
Phase 5 implements multi-store warehouse management, inter-department stock transfer requisitions, dispatch transit, receiving, and inventory conservation on Android.

---

## 2. Inventory Conservation Invariant
* **Transfer Requisition Lifecycle:** `REQUESTED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `RECEIVED`
* **Conservation:** Every stock transfer specifies an exact quantity, unit, issuing source store, and receiving destination store.
* **Server Authority:** Stock quantities are updated exclusively in database transactions on the server.
