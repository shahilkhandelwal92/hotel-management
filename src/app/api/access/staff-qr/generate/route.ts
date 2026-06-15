import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import { requireFeature } from "@/lib/requireFeature";

const QR_VALIDITY_SECONDS = 60;
const HMAC_SECRET = process.env.STAFF_QR_SECRET;

/**
 * ...
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!HMAC_SECRET || HMAC_SECRET.length < 32) {
        return NextResponse.json({ error: "Staff QR is not securely configured" }, { status: 503 });
    }

    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    // ── Gating: Requires Staff QR Feature ────────────────────
    const guard = await requireFeature(hotelId, "SMART_ACCESS_QR");
    if (guard) return guard;

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + QR_VALIDITY_SECONDS;
    const nonce = crypto.randomBytes(8).toString("hex");

    const payload = {
        userId: session.user.id,
        hotelId,
        iat: issuedAt,
        exp: expiresAt,
        nonce,
    };

    const payloadStr = JSON.stringify(payload);
    const signature = crypto
        .createHmac("sha256", HMAC_SECRET)
        .update(payloadStr)
        .digest("hex");

    const token = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    return NextResponse.json({
        token,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        validForSeconds: QR_VALIDITY_SECONDS,
        // The QR code should encode this URL:
        qrUrl: `/api/access/staff-qr/verify?token=${token}`,
    });
}
