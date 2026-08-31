import { createPortalToken, verifyPortalToken } from "../lib/portalAuth";

jest.mock("jose", () => ({
    SignJWT: jest.fn().mockImplementation((payload) => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuer: jest.fn().mockReturnThis(),
        setAudience: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(`mocked.${Buffer.from(JSON.stringify(payload)).toString("base64")}.sig`),
    })),
    jwtVerify: jest.fn().mockImplementation(async (token) => {
        if (!token || typeof token !== "string" || !token.startsWith("mocked.")) {
            throw new Error("Invalid token");
        }
        const parts = token.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        return { payload };
    }),
}));

describe("Scoped Public Portal Authentication (Guest & Corporate)", () => {
    const originalSecret = process.env.JWT_SECRET;

    beforeAll(() => {
        process.env.JWT_SECRET = "test-secret-at-least-32-characters-long-2026";
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalSecret;
    });

    it("signs and verifies a valid guest portal token", async () => {
        const token = await createPortalToken({
            type: "guest",
            subjectId: "reservation-stay-101",
        });

        expect(typeof token).toBe("string");

        const verified = await verifyPortalToken(token, "guest");
        expect(verified).not.toBeNull();
        expect(verified?.type).toBe("guest");
        expect(verified?.subjectId).toBe("reservation-stay-101");
    });

    it("signs and verifies a valid corporate portal token", async () => {
        const token = await createPortalToken({
            type: "corporate",
            subjectId: "event-conf-2026",
        });

        const verified = await verifyPortalToken(token, "corporate");
        expect(verified).not.toBeNull();
        expect(verified?.type).toBe("corporate");
        expect(verified?.subjectId).toBe("event-conf-2026");
    });

    it("rejects token when portal type mismatches (guest trying to use corporate token)", async () => {
        const corporateToken = await createPortalToken({
            type: "corporate",
            subjectId: "event-conf-2026",
        });

        // Attempting to verify a corporate token on guest route
        const verified = await verifyPortalToken(corporateToken, "guest");
        expect(verified).toBeNull();
    });

    it("returns null for malformed or forged tokens", async () => {
        const verified = await verifyPortalToken("invalid.jwt.token", "guest");
        expect(verified).toBeNull();
    });
});
