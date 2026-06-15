import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { requireFeature } from "@/lib/requireFeature";

const HMAC_SECRET = process.env.STAFF_QR_SECRET;

interface QrPayload {
    userId: string;
    hotelId: string;
    iat: number;
    exp: number;
    nonce: string;
}

/**
 * POST /api/access/staff-qr/verify
 *
 * Validates QR token and logs staff attendance.
 * Body:
 *   token     string  (from QR code)
 *   action    "CHECK_IN" | "CHECK_OUT"
 *   latitude? number  (client GPS)
 *   longitude? number
 *   accuracy?  number
 */
export async function POST(req: NextRequest) {
    if (!HMAC_SECRET || HMAC_SECRET.length < 32) {
        return NextResponse.json({ error: "Staff QR is not securely configured" }, { status: 503 });
    }

    const body = await req.json();
    const { token, action, latitude, longitude, accuracy } = body;

    if (!token || !action) {
        return NextResponse.json({ error: "token and action are required" }, { status: 400 });
    }
    if (!["CHECK_IN", "CHECK_OUT"].includes(action)) {
        return NextResponse.json({ error: "action must be CHECK_IN or CHECK_OUT" }, { status: 400 });
    }

    // ── Step 1: Decode and verify HMAC ────────────────────────
    let parsed: { payload: QrPayload; signature: string };
    try {
        parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    } catch {
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
    }

    const { payload, signature } = parsed;
    if (
        !payload ||
        typeof payload.userId !== "string" ||
        typeof payload.hotelId !== "string" ||
        typeof payload.iat !== "number" ||
        typeof payload.exp !== "number" ||
        typeof payload.nonce !== "string" ||
        typeof signature !== "string"
    ) {
        return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const expectedSig = crypto
        .createHmac("sha256", HMAC_SECRET)
        .update(JSON.stringify(payload))
        .digest("hex");

    const suppliedSignature = Buffer.from(signature, "hex");
    const expectedSignature = Buffer.from(expectedSig, "hex");
    if (
        suppliedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
        return NextResponse.json({ error: "Invalid token signature" }, { status: 401 });
    }

    // ── Gating: Requires Staff QR Feature ────────────────────
    const guard = await requireFeature(payload.hotelId, "SMART_ACCESS_QR");
    if (guard) return guard;

    // ── Step 2: Check expiry ───────────────────────────────────
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > payload.exp) {
        return NextResponse.json({ error: "QR token expired. Please scan a fresh QR code." }, { status: 401 });
    }

    // ── Step 3: Geo-fence validation (if coordinates provided) ─
    if (latitude != null && longitude != null) {
        // Fetch hotel coordinates (if stored — optional enforcement)
        const hotel = await prisma.hotel.findUnique({
            where: { id: payload.hotelId },
            select: { id: true, name: true },
        });
        if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

        // TODO Phase C: Add hotel.latitude / hotel.longitude to schema
        // For now, log coordinates for audit without blocking
        // const dist = haversineDistance(hotel.latitude, hotel.longitude, latitude, longitude);
        // if (dist > GEO_FENCE_RADIUS_METERS) {
        //   return NextResponse.json({ error: `You are ${Math.round(dist)}m from hotel. Must be within ${GEO_FENCE_RADIUS_METERS}m.` }, { status: 403 });
        // }
    }

    // ── Step 4: Verify user belongs to hotel ───────────────────
    const user = await prisma.user.findFirst({
        where: {
            id: payload.userId,
            OR: [
                { hotelId: payload.hotelId },
                { roles: { some: { hotelId: payload.hotelId } } },
            ],
        },
        select: { id: true, name: true },
    });
    if (!user) {
        return NextResponse.json({ error: "User not authorized for this hotel" }, { status: 403 });
    }

    // ── Step 5: Prevent duplicate/replayed attendance action ────
    const latestLog = await prisma.staffAttendanceLog.findFirst({
        where: { userId: payload.userId, hotelId: payload.hotelId },
        orderBy: { createdAt: "desc" },
        select: { action: true, createdAt: true },
    });
    if (latestLog?.action === action) {
        return NextResponse.json({
            error: `Staff member is already ${action === "CHECK_IN" ? "checked in" : "checked out"}.`,
        }, { status: 409 });
    }

    // ── Step 6: Log attendance ─────────────────────────────────
    const log = await prisma.staffAttendanceLog.create({
        data: {
            userId: payload.userId,
            hotelId: payload.hotelId,
            action,
            method: "QR",
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            accuracy: accuracy ?? null,
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
            userAgent: req.headers.get("user-agent") ?? null,
        },
    });

    return NextResponse.json({
        success: true,
        action,
        staffName: user.name,
        timestamp: log.createdAt,
        message: `${action === "CHECK_IN" ? "✅ Checked in" : "✅ Checked out"} successfully at ${new Date(log.createdAt).toLocaleTimeString("en-IN")}`,
    });
}
