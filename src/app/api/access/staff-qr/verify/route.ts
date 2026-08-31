import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { requireFeature } from "@/lib/requireFeature";

const HMAC_SECRET = process.env.STAFF_QR_SECRET || (process.env.NODE_ENV === "production" ? "" : "stayos-staff-attendance-hmac-secure-secret-key-32-chars");

interface QrPayload {
    userId: string;
    hotelId: string;
    iat: number;
    exp: number;
    nonce: string;
}

/**
 * Calculates distance in meters between two GPS coordinates using Haversine formula.
 */
export function calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

/**
 * POST /api/access/staff-qr/verify
 *
 * Validates QR token, verifies GPS geofence against hotel location, and logs attendance.
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

    // ── Step 3: Real GPS Geofence Verification ─────────────────
    const hotel = await prisma.hotel.findUnique({
        where: { id: payload.hotelId },
        select: { id: true, name: true, latitude: true, longitude: true, geofenceRadius: true },
    });
    if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

    if (hotel.latitude != null && hotel.longitude != null) {
        if (latitude == null || longitude == null) {
            return NextResponse.json({
                error: "GPS location is required for attendance at this property. Please enable location services.",
            }, { status: 400 });
        }

        const distanceMeters = calculateHaversineDistance(hotel.latitude, hotel.longitude, latitude, longitude);
        const allowedRadius = hotel.geofenceRadius ?? 100; // default 100m

        if (distanceMeters > allowedRadius) {
            return NextResponse.json({
                error: `Geofence violation: You are ${Math.round(distanceMeters)}m from the property. Attendance must be marked within ${allowedRadius}m.`,
                distanceMeters: Math.round(distanceMeters),
                allowedRadius,
            }, { status: 403 });
        }
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

    // ── Step 5: Prevent duplicate / replayed attendance action ──
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
