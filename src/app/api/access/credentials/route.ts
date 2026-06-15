import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { logAudit } from "@/lib/audit";
import { requireFeature } from "@/lib/requireFeature";

/**
 * POST /api/access/credentials
 * Issue a new access credential (key) for a guest or staff member.
 * ...
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    // ── Gating: Requires Mobile Key Feature ──────────────────
    const guard = await requireFeature(hotelId, "SMART_ACCESS_MOBILE_KEY");
    if (guard) return guard;

    const body = await req.json();
    const { reservationId, userId, userType, accessType, accessScope, validFrom, validUntil, provider, roomId, guestName } = body;

    if (!userType || !accessType || !accessScope || !validFrom || !validUntil) {
        return NextResponse.json({ error: "userType, accessType, accessScope, validFrom, validUntil are required" }, { status: 400 });
    }

    // Validate dates
    const from = new Date(validFrom);
    const until = new Date(validUntil);
    if (isNaN(from.getTime()) || isNaN(until.getTime()) || until <= from) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Call the hardware abstraction layer
    const lockProvider = getLockProvider(provider ?? "INTERNAL_QR");
    let externalRef: string | undefined;
    let mobileKeyPayload: string | undefined;

    try {
        const result = await lockProvider.issueKey({
            hotelId, roomId, accessScope, userType,
            validFrom: from, validUntil: until, guestName, reservationId,
        });
        externalRef = result.externalRef;
        mobileKeyPayload = result.mobileKeyPayload;
    } catch (err) {
        console.error("[issueKey error]", err);
        return NextResponse.json({ error: "Lock provider error: " + (err as Error).message }, { status: 502 });
    }

    // Persist to DB
    const credential = await prisma.accessCredential.create({
        data: {
            hotelId, reservationId, userId,
            userType, accessType,
            provider: provider ?? "INTERNAL_QR",
            externalRef,
            accessScope,
            validFrom: from, validUntil: until,
            status: "Active",
            issuedBy: session.user.id as string,
        },
    });

    await logAudit({
        hotelId,
        userId: session.user.id as string,
        module: "AccessCredential",
        action: "CREATE",
        entityId: credential.id,
        newValue: { accessScope, userType, reservationId },
    });

    return NextResponse.json({ credential, mobileKeyPayload }, { status: 201 });
}

/**
 * GET /api/access/credentials
 * List credentials for this hotel (dashboard).
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");         // Active / Revoked / Expired
    const reservationId = searchParams.get("reservationId");
    const scope = searchParams.get("scope");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { hotelId };
    if (status) where.status = status;
    if (reservationId) where.reservationId = reservationId;
    if (scope) where.accessScope = scope;

    // Auto-expire: mark any past validUntil as Expired
    await prisma.accessCredential.updateMany({
        where: { hotelId, status: "Active", validUntil: { lt: new Date() } },
        data: { status: "Expired" },
    });

    const [rows, total] = await Promise.all([
        prisma.accessCredential.findMany({
            where, skip, take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true, userType: true, accessType: true, provider: true,
                accessScope: true, validFrom: true, validUntil: true,
                status: true, revokedAt: true, createdAt: true,
                reservationId: true, userId: true, externalRef: true,
            },
        }),
        prisma.accessCredential.count({ where }),
    ]);

    return NextResponse.json({ credentials: rows, total, page, limit });
}
