# StayOS Controlled Pilot & Production Go-Live Checklist

## 1. Production Readiness Checklist

### Backend & Database
- [x] Production PostgreSQL configured on Neon with PITR enabled
- [x] Prisma Schema validated & all migrations applied cleanly
- [x] Next.js 16 production build compiles without errors
- [x] HTTPS TLS encryption active on `https://pms.stayos.com`
- [x] HS256 JWT authentication with Bearer & SecureStore support active
- [x] Server-side RBAC & multi-tenant isolation enforced on every route

### Hotel Property Provisioning
- [x] Property organization, rooms, rate plans & GST tax slabs configured
- [x] Department staff accounts created with restricted job roles
- [x] Multi-store warehouses (Central, Linen, Floor Pantries) registered
- [x] Restaurant menu categories and recipes configured

### Android Mobile App (`com.stayos.operations`)
- [x] Version 1.0.1 (VersionCode 2) release candidate generated
- [x] 2.96 MB optimized Hermes bytecode bundle verified
- [x] Zero hard-coded hotel IDs, passwords, or database secrets in client bundle
- [x] Physical Android 12 & 14 device acceptance passed
- [x] Full business-day operations simulation passed 10/10

### External Dependencies (Property Onboarding)
- [ ] Live Razorpay / Stripe credentials configured (Required if processing live online payments)
- [ ] Live Channel Manager OTA API credentials configured (Required if live OTA sync needed)
- [ ] Live Smart Lock gateway bridge hardware deployed (Required if keycard dispensing enabled)
