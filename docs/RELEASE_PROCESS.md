# StayOS — Production Release & Change Control Process

## 1. Versioning Standards
* **Current Certified Release:** `v1.0.1` (VersionCode `2`)
* **Semantic Versioning:**
  * **Patch (1.0.x):** Production bug fixes, reliability patches, security fixes.
  * **Minor (1.x.0):** Backward-compatible feature enhancements.
  * **Major (x.0.0):** Breaking architectural, API, or database migrations.

---

## 2. Pre-Release Verification Gates
Before tagging or deploying any production release:
1. **Backend Verification:**
   * `npm test -- --runInBand` (100% PASS)
   * `npx tsc --noEmit` (0 errors)
   * `npm run lint` (0 errors)
   * `npx prisma validate` (Valid schema)
   * `npm run build` (145/145 static & dynamic routes)
2. **Mobile Android Verification:**
   * `cd mobile && npm test -- --runInBand` (100% PASS)
   * `npx tsc --noEmit` (0 errors)
   * `npx expo export --platform android` (Valid Hermes bytecode bundle)
