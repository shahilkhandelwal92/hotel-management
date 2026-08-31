# StayOS Mobile Automated Test Plan & Lineage

## 1. Test Strategy
The StayOS mobile application maintains automated Jest test suites covering authentication, API client error normalization, housekeeping workflows, and design system component contracts.

---

## 2. Test Matrix

### `mobile/__tests__/auth.test.ts`
* [x] SecureStore token write & read (`PASS`)
* [x] SecureStore token deletion on logout (`PASS`)
* [x] Successful login credential exchange (`PASS`)
* [x] Rejection of invalid credentials with 401 (`PASS`)

### `mobile/__tests__/client.test.ts`
* [x] Automatic Bearer header injection (`PASS`)
* [x] 401 handling, token purge & callback trigger (`PASS`)
* [x] 403 Forbidden error normalization (`PASS`)
* [x] 409 Conflict concurrency handling (`PASS`)
* [x] Network disconnection offline normalization (`PASS`)

### `mobile/__tests__/housekeeping.test.ts`
* [x] Fetch room task board with query filters (`PASS`)
* [x] Mutate task status to `InProgress` on start cleaning (`PASS`)
* [x] Complete cleaning and mark room Clean in PMS (`PASS`)
* [x] Record new Lost & Found guest article (`PASS`)

### `mobile/__tests__/components.test.tsx`
* [x] AppButton prop contract (`PASS`)
* [x] AppInput prop contract (`PASS`)
* [x] Theme color validity (`PASS`)
* [x] StatusBadge & RoomStatusBadge variants (`PASS`)

---

## 3. Execution Commands
```bash
# Run all mobile tests
cd mobile && npm test

# Run TypeScript type check
cd mobile && npx tsc --noEmit

# Validate Android JS bundle export
cd mobile && npx expo export --platform android
```
