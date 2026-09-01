# StayOS Phase 12 — Go-Live Readiness Checklist

| Requirement | Responsible Owner | Status | Evidence Source |
| :--- | :--- | :--- | :--- |
| **Programmatic Hotel Setup** | Hotel Admin / GM | **PASS** | `POST /api/hotels` validated |
| **GST & Tax Rules** | Accounting Lead | **PASS** | Exact 5%, 12%, 18% slab rules |
| **Room Inventory & Rates** | Front Office Manager | **PASS** | Categories, rates & room inventory mapped |
| **Staff & Department RBAC** | HR / Security | **PASS** | Role assignment & server permission gates |
| **Stores & Opening Stock** | Stores Manager | **PASS** | Multi-store inventory balances verified |
| **Android App Deployment** | IT Systems Lead | **PASS** | `com.stayos.operations` release build |
| **Physical Android Testing**| IT Lead | **PASS** | Android 12 & Android 14 verified |
| **Financial Conservation** | Financial Controller | **PASS** | Exact ₹0.00 zero-balance checkout |
| **Night Audit Rollover** | Night Auditor | **PASS** | D $\rightarrow$ D+1 day lock & revenue snapshot |
| **Payment Gateway Live Keys**| General Manager | **UNVERIFIED**| Property Onboarding Dependency |
| **OTA Live Credentials** | Revenue Manager | **UNVERIFIED**| Property Onboarding Dependency |
| **Smart Locks Hardware** | Engineering Lead | **UNVERIFIED**| Physical Hardware Dependency |
| **Disaster Recovery (PITR)** | DevOps Lead | **VERIFIED** | Neon Continuous WAL Archiving Active |
| **2,000-User Scale Test** | DevOps Lead | **UNVERIFIED**| 100-way local concurrency verified |
