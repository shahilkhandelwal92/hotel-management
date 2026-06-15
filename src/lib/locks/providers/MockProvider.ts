import type { IssueKeyParams, VendorAccessLog, FetchLogParams, LockProvider } from "../LockProvider";

/**
 * MockProvider — Default LockProvider for development and demo hotels
 * ─────────────────────────────────────────────────────────────────────
 * Simulates all lock operations locally with no hardware dependency.
 * - issueKey returns a fake reference using a UUID-like token
 * - revokeKey is a no-op
 * - fetchLogs returns generated fake events
 * - verifyWebhookSignature always returns true (no secret needed in mock)
 *
 * Switch to AssaAbloyProvider or DormakabaProvider by setting
 * LOCK_PROVIDER=ASSA_ABLOY / DORMAKABA in env vars.
 */
export class MockProvider implements LockProvider {
    async issueKey(params: IssueKeyParams): Promise<{ externalRef: string; mobileKeyPayload?: string }> {
        const externalRef = `MOCK-${params.userType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        // Simulate mobile key payload (QR code data for guest app)
        const mobileKeyPayload = Buffer.from(
            JSON.stringify({ ref: externalRef, scope: params.accessScope, validUntil: params.validUntil })
        ).toString("base64");

        // Simulate async latency (hardware API call)
        await new Promise((r) => setTimeout(r, 50));

        console.log(`[MockProvider] Issued key: ${externalRef} (scope=${params.accessScope})`);
        return { externalRef, mobileKeyPayload };
    }

    async revokeKey(externalRef: string, hotelId: string): Promise<void> {
        await new Promise((r) => setTimeout(r, 30));
        console.log(`[MockProvider] Revoked key: ${externalRef} (hotel=${hotelId})`);
    }

    async fetchLogs(params: FetchLogParams): Promise<VendorAccessLog[]> {
        // Generate realistic fake events for demo/testing
        const now = new Date();
        return [
            {
                externalRef: params.externalRef ?? "MOCK-UNKNOWN",
                action: "ENTRY",
                deviceId: "MOCK-DOOR-01",
                timestamp: new Date(now.getTime() - 5 * 60000),
                rawPayload: { source: "mock" },
            },
            {
                externalRef: params.externalRef ?? "MOCK-UNKNOWN",
                action: "EXIT",
                deviceId: "MOCK-DOOR-01",
                timestamp: new Date(now.getTime() - 2 * 60000),
                rawPayload: { source: "mock" },
            },
        ];
    }

    verifyWebhookSignature(_rawBody: string, _signature: string): boolean {
        // Mock always accepts — real providers check HMAC against shared secret
        return true;
    }
}
