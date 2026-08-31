import { MockProvider } from "../lib/locks/providers/MockProvider";

function validateAccessKey(
    key: {
        status: "Active" | "Revoked" | "Expired";
        validFrom: Date;
        validUntil: Date;
        accessScope: string;
    },
    currentTime: Date,
    requestedScope = "RoomOnly"
): { allowed: boolean; reason?: string } {
    if (key.status !== "Active") {
        return { allowed: false, reason: `Key is ${key.status}` };
    }

    if (currentTime < key.validFrom) {
        return { allowed: false, reason: "Stay has not started yet (Pre-arrival)" };
    }

    if (currentTime > key.validUntil) {
        return { allowed: false, reason: "Key has expired (Post-checkout)" };
    }

    if (key.accessScope !== "AllAccess" && key.accessScope !== requestedScope) {
        return { allowed: false, reason: `Scope mismatch: required ${requestedScope}, have ${key.accessScope}` };
    }

    return { allowed: true };
}

describe("Smart Access & Digital Key Logic", () => {
    const validFrom = new Date("2026-09-01T14:00:00Z");
    const validUntil = new Date("2026-09-03T11:00:00Z");

    const activeCredential = {
        status: "Active" as const,
        validFrom,
        validUntil,
        accessScope: "RoomOnly",
    };

    it("allows door access during active valid stay window", () => {
        const midStay = new Date("2026-09-02T10:00:00Z");
        const check = validateAccessKey(activeCredential, midStay, "RoomOnly");

        expect(check.allowed).toBe(true);
    });

    it("denies access before check-in time", () => {
        const beforeStay = new Date("2026-09-01T10:00:00Z"); // 4 hours before check-in
        const check = validateAccessKey(activeCredential, beforeStay, "RoomOnly");

        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Pre-arrival");
    });

    it("denies access after checkout expiry", () => {
        const afterStay = new Date("2026-09-03T12:00:00Z"); // 1 hour after checkout
        const check = validateAccessKey(activeCredential, afterStay, "RoomOnly");

        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("expired");
    });

    it("denies access when key has been explicitly revoked", () => {
        const midStay = new Date("2026-09-02T10:00:00Z");
        const revokedKey = { ...activeCredential, status: "Revoked" as const };
        const check = validateAccessKey(revokedKey, midStay, "RoomOnly");

        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Revoked");
    });

    it("issues valid key with mobile payload via MockProvider HAL", async () => {
        const provider = new MockProvider();
        const result = await provider.issueKey({
            hotelId: "hotel-demo",
            roomId: "room-101",
            accessScope: "RoomOnly",
            userType: "Guest",
            validFrom,
            validUntil,
        });

        expect(result.externalRef).toMatch(/^MOCK-GUEST-/);
        expect(result.mobileKeyPayload).toBeDefined();

        // Decode payload
        const decoded = JSON.parse(Buffer.from(result.mobileKeyPayload!, "base64").toString("utf8"));
        expect(decoded.ref).toBe(result.externalRef);
        expect(decoded.scope).toBe("RoomOnly");
    });
});
