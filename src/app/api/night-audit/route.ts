import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import type { Prisma } from "@prisma/client";

const NIGHT_AUDIT_ROLES = [
    "SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "ACCOUNTING", "NIGHT_AUDIT",
];

// GET – fetch night audits for a hotel
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get("hotelId"));
    const month = searchParams.get("month"); // "2026-03"

    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    let dateFilter = {};
    if (month) {
        const [yr, mo] = month.split("-").map(Number);
        dateFilter = {
            auditDate: {
                gte: new Date(yr, mo - 1, 1),
                lt: new Date(yr, mo, 1),
            },
        };
    }

    const audits = await prisma.nightAudit.findMany({
        where: { hotelId, ...dateFilter },
        orderBy: { auditDate: "desc" },
        take: 60,
    });

    return NextResponse.json({ audits });
}

// POST – open/initialize today's night audit
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const { hotelId: requestedHotelId, auditDate: auditDateStr } = await req.json();
    const hotelId = resolveRequestedHotel(access, requestedHotelId);
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const auditDate = new Date(auditDateStr ?? new Date());
    if (Number.isNaN(auditDate.getTime())) {
        return NextResponse.json({ error: "Invalid audit date" }, { status: 400 });
    }
    auditDate.setHours(0, 0, 0, 0);

    const existing = await prisma.nightAudit.findUnique({
        where: { hotelId_auditDate: { hotelId, auditDate } },
    });
    if (existing) return NextResponse.json({ audit: existing });

    // Auto-calculate revenue from invoices paid today
    const dayStart = new Date(auditDate);
    const dayEnd = new Date(auditDate);
    dayEnd.setHours(23, 59, 59, 999);

    const [invoices, rooms, occupied] = await Promise.all([
        prisma.invoice.findMany({
            where: { hotelId, createdAt: { gte: dayStart, lte: dayEnd } },
            include: { items: true },
        }),
        prisma.room.count({ where: { hotelId } }),
        prisma.room.count({ where: { hotelId, status: "Occupied" } }),
    ]);

    let roomRevenue = 0, fbRevenue = 0, amenityRevenue = 0, eventRevenue = 0, otherRevenue = 0;

    for (const inv of invoices) {
        for (const item of inv.items) {
            switch (item.itemType) {
                case "Room": roomRevenue += item.lineTotal; break;
                case "Food": fbRevenue += item.lineTotal; break;
                case "Amenity": amenityRevenue += item.lineTotal; break;
                case "Event": eventRevenue += item.lineTotal; break;
                default: otherRevenue += item.lineTotal; break;
            }
        }
    }

    const totalRevenue = roomRevenue + fbRevenue + amenityRevenue + eventRevenue + otherRevenue;
    const occupancyPct = rooms > 0 ? Math.round((occupied / rooms) * 100) : 0;

    const audit = await prisma.nightAudit.create({
        data: {
            hotelId, auditDate,
            roomRevenue, fbRevenue, amenityRevenue, eventRevenue, otherRevenue,
            totalRevenue, occupiedRooms: occupied, totalRooms: rooms, occupancyPct,
        },
    });

    return NextResponse.json({ audit });
}

// PUT – close or reopen a day
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, NIGHT_AUDIT_ROLES)) {
        return NextResponse.json({ error: "Night audit access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, notes, reopenReason } = body;

    const existing = await prisma.nightAudit.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!resolveRequestedHotel(access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (action !== "close" && action !== "reopen") {
        return NextResponse.json({ error: "Invalid night audit action" }, { status: 400 });
    }

    // Reopen requires super admin
    if (action === "reopen") {
        if (!access.isSuperAdmin) {
            return NextResponse.json({ error: "Only Super Admin can reopen a closed night audit" }, { status: 403 });
        }
        if (!existing.isDayClosed) {
            return NextResponse.json({ error: "Night audit is not closed" }, { status: 422 });
        }
        if (typeof reopenReason !== "string" || !reopenReason.trim()) {
            return NextResponse.json({ error: "A reopen reason is required" }, { status: 400 });
        }
    } else if (existing.isDayClosed) {
        return NextResponse.json({ error: "Night audit is already closed" }, { status: 422 });
    }

    const updateData: Prisma.NightAuditUpdateInput = action === "close"
        ? { isDayClosed: true, status: "Closed", closedAt: new Date(), closedById: session.user.id, notes }
        : { isDayClosed: false, status: "Reopened", reopenedAt: new Date(), reopenedById: session.user.id, reopenReason };

    const audit = await prisma.nightAudit.update({ where: { id }, data: updateData });

    await logAudit({
        hotelId: existing.hotelId,
        userId: session.user.id as string,
        module: "NightAudit",
        action: action === "close" ? "NIGHT_AUDIT_CLOSE" : "NIGHT_AUDIT_REOPEN",
        entityId: audit.id,
        details: action === "close" ? notes : reopenReason,
        req,
    });

    return NextResponse.json({ audit });
}
