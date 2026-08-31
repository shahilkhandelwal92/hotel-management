# StayOS Android Operations — Architecture Specification

## 1. System Topology
StayOS Android (`com.stayos.operations`) is an enterprise mobile client communicating directly with the StayOS Next.js / Node API cluster over HTTPS.

```
┌──────────────────────────────────────────────────────────┐
│                   STAYOS ANDROID APP                     │
│               (React Native + Expo SDK 52)               │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Expo Router  │  │  AuthContext │  │ TanStack Query │  │
│  │ (Protected)  │  │ (SecureStore)│  │ (Server State) │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                  │           │
│         └─────────────────┼──────────────────┘           │
│                           ▼                              │
│              mobile/src/api/client.ts                    │
│      (Automatic Bearer Auth + Error Normalizer)          │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS (Bearer Token)
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   STAYOS BACKEND API                     │
│                                                          │
│  ┌─────────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │   Auth Engine   │ │ Tenant Boundary│ │ RBAC Engine │  │
│  │ (src/lib/auth)  │ │ (tenantContext)│ │(permissions)│  │
│  └────────┬────────┘ └───────┬────────┘ └──────┬──────┘  │
│           └──────────────────┼─────────────────┘         │
│                              ▼                           │
│                  Domain Operations Engines               │
│               (Housekeeping, Billing, POS)               │
│                              ▼                           │
│                  Prisma ORM + PostgreSQL 16              │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Core Design Invariants
1. **Single Source of Truth:** The server remains the sole authority for business dates, room turnover state, decimal arithmetic, and RBAC permissions.
2. **Zero Client Secrets:** No database credentials, JWT secret keys, merchant API keys, or OTA passwords exist in the mobile bundle.
3. **Hardware-Backed Storage:** Authentication credentials are stored in Android KeyStore via `expo-secure-store`. `AsyncStorage` is never used for security tokens.
4. **Optimistic Error Invalidation:** Whenever an operational mutation fails, the client immediately invalidates the affected query cache and pulls fresh authoritative state from the server.

---

## 3. Directory Layout
```
mobile/
├── app/
│   ├── _layout.tsx                     # Global App Wrapper (QueryClient + AuthProvider)
│   ├── index.tsx                       # Splash / Initial Navigation Router
│   ├── (auth)/
│   │   ├── _layout.tsx                 # Public Auth Stack
│   │   └── login.tsx                   # Staff Credential Login View
│   └── (app)/
│       ├── _layout.tsx                 # Protected Route Guard
│       ├── dashboard.tsx               # Role-Aware Operations Grid
│       └── housekeeping/
│           ├── index.tsx               # Live Room Board & Filter Chips
│           ├── room.tsx                # Room Turnover Checklist & Status Actions
│           └── lost-found.tsx          # Guest Property Register & Claim Modal
├── src/
│   ├── api/
│   │   ├── client.ts                   # Central Fetch Client (Bearer Injection + Errors)
│   │   └── types.ts                    # Strongly Typed API Data Models
│   ├── auth/
│   │   └── AuthContext.tsx             # Auth Session State & Permission Helpers
│   ├── components/                     # Reusable Mobile Design System
│   │   ├── AppButton.tsx
│   │   ├── AppInput.tsx
│   │   ├── AppCard.tsx
│   │   ├── AppHeader.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── RoomStatusBadge.tsx
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── PermissionGate.tsx
│   └── theme/
│       └── colors.ts                   # Dark-Mode Operational Design Palette
├── __tests__/                          # Automated Test Suites (Jest)
├── app.json                            # Expo Application Manifest
└── tsconfig.json                       # TypeScript Configuration
```
