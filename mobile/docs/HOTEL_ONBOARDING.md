# StayOS Hotel Onboarding & Mobile Deployment Guide

## 1. Property Setup Sequence

```
1. Create Hotel Property & Organization in Admin Portal
        │
2. Configure Room Inventory (Room Types, Pricing, Amenities)
        │
3. Set Up Rate Plans, Meal Plans & GST Tax Configuration
        │
4. Provision Staff Users & Assign Department Job Roles
        │
5. Configure Department Stores & Kitchen Menu Dishes
        │
6. (Optional) Configure Live Payment Gateway & Smart Lock Integrations
        │
7. Install StayOS Operations APK on Staff Android Devices
        │
8. Staff Login with Assigned Role Credentials
        │
9. Launch Controlled Hotel Pilot
```

---

## 2. External Provider Dependencies (Marked per Property)
* **Payment Gateway:** Razorpay / Stripe live API keys configured in backend settings.
* **Smart Locks:** TTLock / Salto gateway bridges configured.
* **OTA Channels:** Channel Manager API credentials linked.
*(Note: Core operations, Front Desk, Housekeeping, Cashier, POS, KDS, Engineering, and Stores operate fully on StayOS PMS without third-party dependencies).*
