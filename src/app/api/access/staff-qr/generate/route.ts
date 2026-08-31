import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireFeature } from "@/lib/requireFeature";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const QR_VALIDITY_SECONDS = 60;
const HMAC_SECRET = process.env.STAFF_QR_SECRET || process.env.JWT_SECRET || "development-staff-qr-hmac-secret-key-32-chars-long";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const guard = await requireFeature(hotelId, "SMART_ACCESS_QR");
    if (guard) return guard;

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + QR_VALIDITY_SECONDS;
    const nonce = crypto.randomBytes(8).toString("hex");

    const payload = {
        userId: auth.userId,
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
        qrUrl: `/api/access/staff-qr/verify?token=${token}`,
    });
}
