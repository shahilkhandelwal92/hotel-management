import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { logAudit } from "@/lib/audit";
import { requireFeature } from "@/lib/requireFeature";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

/**
 * POST /api/access/credentials
 * Issue a new access credential (key) for a guest or staff member.
 */
export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const guard = await requireFeature(hotelId, "SMART_ACCESS_MOBILE_KEY");
    if (guard) return guard;

    const body = await req.json();
    const { reservationId, userId, userType, accessType, accessScope, validFrom, validUntil, provider, roomId, guestName } = body;

    if (!userType || !accessType || !accessScope || !validFrom || !validUntil) {
        return NextResponse.json({ error: "userType, accessType, accessScope, validFrom, validUntil are required" }, { status: 400 });
    }

    const from = new Date(validFrom);
    const until = new Date(validUntil);
    if (isNaN(from.getTime()) || isNaN(until.getTime()) || until <= from) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

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

    const credential = await prisma.accessCredential.create({
        data: {
            hotelId, reservationId, userId,
            userType, accessType,
            provider: provider ?? "INTERNAL_QR",
            accessScope,
            validFrom: from,
            validUntil: until,
            externalRef,
            issuedBy: auth.userId,
            status: "Active",
        },
    });

    await logAudit({
        hotelId,
        userId: auth.userId,
        module: "AccessCredential",
        action: "CREATE",
        entityId: credential.id,
        newValue: { userType, accessType, accessScope, validFrom, validUntil, provider },
        req,
    });

    return NextResponse.json({ credential }, { status: 201 });
}

/**
 * GET /api/access/credentials
 * List credentials for this hotel (dashboard).
 */
export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const reservationId = searchParams.get("reservationId");
    const scope = searchParams.get("scope");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { hotelId };
    if (status) where.status = status;
    if (reservationId) where.reservationId = reservationId;
    if (scope) where.accessScope = scope;

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
