import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LOST_FOUND_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Prisma.LostAndFoundWhereInput = {
        hotelId,
        ...(status ? { status } : {}),
    };

    try {
        const items = await prisma.lostAndFound.findMany({
            where,
            orderBy: { foundDate: "desc" },
        });
        return NextResponse.json({ items });
    } catch (err) {
        console.error("GET /api/housekeeping/lost-found error:", err);
        return NextResponse.json({ error: "Failed to fetch lost and found items" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LOST_FOUND_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { itemName, description, foundLocation, foundByName, guestName, guestContact, estimatedValue } = body;

        if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
            return NextResponse.json({ error: "Item name is required" }, { status: 400 });
        }

        const estValueDec = new Prisma.Decimal(estimatedValue ?? 0);
        if (estValueDec.isNegative()) {
            return NextResponse.json({ error: "Estimated value cannot be negative" }, { status: 400 });
        }

        const item = await prisma.lostAndFound.create({
            data: {
                hotelId,
                itemName: itemName.trim(),
                description: description?.trim() || null,
                foundLocation: foundLocation?.trim() || null,
                foundByName: foundByName?.trim() || null,
                guestName: guestName?.trim() || null,
                guestContact: guestContact?.trim() || null,
                estimatedValue: estValueDec,
                status: "Found",
            },
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "Housekeeping",
            action: "CREATE",
            entityId: item.id,
            newValue: { itemName: item.itemName, status: item.status },
            req,
        });

        return NextResponse.json({ item }, { status: 201 });
    } catch (err) {
        console.error("POST /api/housekeeping/lost-found error:", err);
        return NextResponse.json({ error: "Failed to log lost and found item" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LOST_FOUND_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const { id, status, guestName, guestContact, notes } = body;

        if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 });

        const existing = await prisma.lostAndFound.findFirst({
            where: { id, hotelId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Lost and found record not found for this property" }, { status: 404 });
        }

        const validStatuses = ["Found", "Claimed", "Disposed"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        const updateData: Prisma.LostAndFoundUpdateInput = {};
        if (status) {
            updateData.status = status;
            updateData.resolvedAt = (status === "Claimed" || status === "Disposed") ? new Date() : null;
        }
        if (guestName !== undefined) updateData.guestName = guestName?.trim() || null;
        if (guestContact !== undefined) updateData.guestContact = guestContact?.trim() || null;

        const item = await prisma.lostAndFound.update({
            where: { id },
            data: updateData,
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "Housekeeping",
            action: "UPDATE",
            entityId: item.id,
            oldValue: { status: existing.status, guestName: existing.guestName },
            newValue: { status: item.status, guestName: item.guestName, notes },
            req,
        });

        return NextResponse.json({ item });
    } catch (err) {
        console.error("PUT /api/housekeeping/lost-found error:", err);
        return NextResponse.json({ error: "Failed to update lost and found item" }, { status: 500 });
    }
}
