import type { LockProvider } from "./LockProvider";
import { MockProvider } from "./providers/MockProvider";

/**
 * getLockProvider — Factory
 * ─────────────────────────────────────────────────────────────
 * Returns the correct LockProvider implementation.
 * Business logic calls getLockProvider(hotel.lockProvider) — never
 * imports vendor SDKs directly.
 *
 * Adding a new vendor in Phase C:
 *   1. Create src/lib/locks/providers/AssaAbloyProvider.ts
 *   2. Add case "ASSA_ABLOY" below
 *   3. That's it — zero changes to business logic
 */
export function getLockProvider(providerName?: string | null): LockProvider {
    switch ((providerName ?? "INTERNAL_QR").toUpperCase()) {
        case "ASSA_ABLOY":
            // Phase C: import { AssaAbloyProvider } from "./providers/AssaAbloyProvider";
            // return new AssaAbloyProvider();
            throw new Error("ASSA_ABLOY provider is not yet integrated (Phase C). Using MockProvider for now.");

        case "DORMAKABA":
            // Phase C: import { DormakabaProvider } from "./providers/DormakabaProvider";
            // return new DormakabaProvider();
            throw new Error("DORMAKABA provider is not yet integrated (Phase C). Using MockProvider for now.");

        case "INTERNAL_QR":
        case "MOCK":
        default:
            return new MockProvider();
    }
}
