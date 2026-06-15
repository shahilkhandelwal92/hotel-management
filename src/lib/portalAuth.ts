import { jwtVerify, SignJWT } from "jose";

export type PortalType = "corporate" | "guest";

export type PortalSession = {
    type: PortalType;
    subjectId: string;
};

function getPortalKey(): Uint8Array {
    const secret = process.env.PORTAL_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("PORTAL_TOKEN_SECRET or JWT_SECRET must contain at least 32 characters.");
    }
    return new TextEncoder().encode(secret);
}

export async function createPortalToken(session: PortalSession): Promise<string> {
    return new SignJWT({
        portalType: session.type,
        subjectId: session.subjectId,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("hotel-management")
        .setAudience("hotel-portal")
        .setIssuedAt()
        .setExpirationTime("12h")
        .sign(getPortalKey());
}

export async function verifyPortalToken(
    token: string | undefined,
    expectedType: PortalType,
): Promise<PortalSession | null> {
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getPortalKey(), {
            algorithms: ["HS256"],
            issuer: "hotel-management",
            audience: "hotel-portal",
        });

        if (payload.portalType !== expectedType || typeof payload.subjectId !== "string") {
            return null;
        }

        return { type: expectedType, subjectId: payload.subjectId };
    } catch {
        return null;
    }
}
