/**
 * LockProvider Interface — Hardware Abstraction Layer
 * ─────────────────────────────────────────────────────────────
 * All lock hardware vendors implement this interface.
 * Business logic NEVER imports vendor SDKs directly.
 *
 * Current implementations:
 *   - MockProvider       (default — simulates locks locally)
 *   - AssaAbloyProvider  (Phase C — not yet implemented)
 *   - DormakabaProvider  (Phase C — not yet implemented)
 */

export interface IssueKeyParams {
    hotelId: string;
    roomId?: string;
    accessScope: string;   // RoomOnly / AllAccess / GymOnly / PoolOnly / ParkingOnly
    userType: string;      // Guest / Staff
    validFrom: Date;
    validUntil: Date;
    guestName?: string;
    reservationId?: string;
}

export interface VendorAccessLog {
    externalRef: string;
    action: string;        // ENTRY / EXIT / DENIED
    deviceId?: string;
    timestamp: Date;
    rawPayload?: unknown;
}

export interface FetchLogParams {
    externalRef?: string;
    from?: Date;
    to?: Date;
    roomId?: string;
}

export interface LockProvider {
    /** Issue a new key credential. Returns vendor's external reference ID. */
    issueKey(params: IssueKeyParams): Promise<{ externalRef: string; mobileKeyPayload?: string }>;

    /** Revoke an existing key at the hardware level. */
    revokeKey(externalRef: string, hotelId: string): Promise<void>;

    /** Fetch access logs from vendor (used in Phase C). */
    fetchLogs(params: FetchLogParams): Promise<VendorAccessLog[]>;

    /** Verify a vendor webhook payload signature. Returns true if valid. */
    verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
