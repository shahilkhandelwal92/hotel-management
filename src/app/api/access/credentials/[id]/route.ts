import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { logAudit } from "@/lib/audit";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

/**
 * DELETE /api/access/credentials/[id]
 * Revoke a specific access credential at both the vendor level and DB level.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_UPDATE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { id } = await params;

    const credential = await prisma.accessCredential.findFirst({
        where: { id, hotelId },
    });

    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.status === "Revoked") {
        return NextResponse.json({ error: "Credential already revoked" }, { status: 409 });
    }

    if (credential.externalRef) {
        try {
            const lockProvider = getLockProvider(credential.provider);
            await lockProvider.revokeKey(credential.externalRef, hotelId);
        } catch (err) {
            console.error("[revokeKey error]", err);
        }
    }

    const updated = await prisma.accessCredential.update({
        where: { id },
        data: {
            status: "Revoked",
            revokedAt: new Date(),
            revokedBy: auth.userId,
        },
    });

    await logAudit({
        hotelId,
        userId: auth.userId,
        module: "AccessCredential",
        action: "DELETE",
        entityId: id,
        oldValue: { status: "Active" },
        newValue: { status: "Revoked" },
    });

    return NextResponse.json({ credential: updated });
}

/**
 * GET /api/access/credentials/[id]
 * Inspect a specific credential and fetch its access logs.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requirePermission(req, PERMISSIONS.ROOM_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { id } = await params;

    const credential = await prisma.accessCredential.findFirst({
        where: { id, hotelId },
        include: {
            accessLogs: {
                orderBy: { timestamp: "desc" },
                take: 20,
            },
        },
    });

    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

    return NextResponse.json({ credential });
}
