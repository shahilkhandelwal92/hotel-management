# StayOS Free & Open-Source Dependency Register

## 1. Zero Paid SaaS Dependency Policy
The StayOS Android Operations application is built strictly using free and open-source tooling, libraries, and native Android frameworks.

---

## 2. Dependency Audit

| Component | Library / Tool | License | SaaS Fee | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Core Framework** | React Native | MIT | $0 | Industry standard mobile framework. |
| **Mobile Toolchain** | Expo SDK 52 | MIT | $0 | Standard build tools, bundler, and native bindings. |
| **File Routing** | Expo Router | MIT | $0 | Unified typed file-system routing. |
| **Secure KeyStore** | `expo-secure-store` | MIT | $0 | Native Android KeyStore encrypted token storage. |
| **Server State** | TanStack Query v5 | MIT | $0 | High performance caching, query deduplication, mutations. |
| **Language** | TypeScript | Apache-2.0 | $0 | End-to-end type safety and compilation verification. |
| **Testing** | Jest | MIT | $0 | Unit and integration testing engine. |
| **Build Tooling** | Gradle & Android SDK | Apache-2.0 | $0 | Local native APK generation without cloud dependency. |

---

## 3. Explicitly Avoided Paid Dependencies
* **No Paid Firebase Auth / Cloud Firestore:** Authentication is handled by existing StayOS backend JWT and PostgreSQL.
* **No Paid Push Services:** Local and standard operational polling via TanStack Query.
* **No Paid Analytics:** Zero telemetry overhead on staff battery and bandwidth.
