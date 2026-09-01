# StayOS Android Production Configuration Strategy

## 1. Environment Variables & Public Configuration

| Environment Variable | Target | Type | Notes |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Backend HTTPS URL | Public / Client-Safe | Must use HTTPS in production (e.g. `https://pms.stayos.com`). Missing variable in production builds fails with `CONFIG_ERROR`. |

---

## 2. Server-Side Secret Isolation (NEVER in Mobile Application)
The following secrets are strictly prohibited from client bundles and reside exclusively in backend environment variables:
* `DATABASE_URL` / PostgreSQL credentials
* `JWT_SECRET`
* `RAZORPAY_KEY_SECRET`
* `STRIPE_SECRET_KEY`
* OTA / GDS Channel Manager API Keys
* Smart-Lock Cloud Bridge Credentials

---

## 3. Network Failure & Offline Behavior
* **Offline Detection:** Displays clear offline warnings; mutation buttons are disabled during active network requests.
* **No Blind Financial Retries:** Financial postings (payments, split folios, cashier drops) require explicit user status verification before retry to prevent duplicate transaction posting.
