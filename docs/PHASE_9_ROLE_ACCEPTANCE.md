# StayOS Phase 9 Staff Role Acceptance Matrix

## 1. Role Operational Validation Matrix

| Staff Role | Permitted Action | Prohibited Action Tested | Server Enforcement | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Front Desk** | Check in guest & collect deposit | Modify tax configuration | Server returns `403 Forbidden` | **PASS** |
| **Cashier** | Record payments & safe drops | Self-approve shortage variance | Server returns `403 Forbidden` | **PASS** |
| **Housekeeping** | Complete cleaning & record minibar | View financial reports | Server returns `403 Forbidden` | **PASS** |
| **Kitchen** | Advance KDS queue (Preparing $\rightarrow$ Ready) | Modify guest folio | Server returns `403 Forbidden` | **PASS** |
| **Technician** | Log work orders & lock OOO rooms | Assign clean room to guest | Server returns `403 Forbidden` | **PASS** |
| **Storekeeper** | Issue & receive stock transfers | Disburse cash float | Server returns `403 Forbidden` | **PASS** |
| **Accounting** | Review audit logs & invoices | Alter room occupancy status | Server returns `403 Forbidden` | **PASS** |
