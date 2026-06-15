import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/access/credentials/[id]
 * Revoke a specific access credential at both the vendor level and DB level.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { id } = await params;

    const credential = await prisma.accessCredential.findFirst({
        where: { id, hotelId },
    });

    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.status === "Revoked") {
        return NextResponse.json({ error: "Credential already revoked" }, { status: 409 });
    }

    // Call hardware abstraction layer to revoke at vendor level
    if (credential.externalRef) {
        try {
            const lockProvider = getLockProvider(credential.provider);
            await lockProvider.revokeKey(credential.externalRef, hotelId);
        } catch (err) {
            console.error("[revokeKey error]", err);
            // Log but don't fail — still mark as Revoked in DB
        }
    }

    const updated = await prisma.accessCredential.update({
        where: { id },
        data: {
            status: "Revoked",
            revokedAt: new Date(),
            revokedBy: session.user.id as string,
        },
    });

    await logAudit({
        hotelId,
        userId: session.user.id as string,
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
 * Get a single credential with its access log.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });

    const { id } = await params;

    const credential = await prisma.accessCredential.findFirst({
        where: { id, hotelId },
        include: {
            accessLogs: {
                orderBy: { timestamp: "desc" },
                take: 50,
                select: { id: true, action: true, source: true, deviceId: true, timestamp: true, userType: true, roomId: true },
            },
        },
    });

    if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ credential });
}
