import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createGroupBlock,
    addGuestToRoomingList,
    releaseUnusedGroupBlocks,
} from "@/lib/groupBlockEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.GROUP_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const groups = await prisma.groupBlock.findMany({
        where: { hotelId: tenant.hotelId },
        include: { roomingList: true },
        orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.GROUP_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "ADD_GUEST") {
            const result = await addGuestToRoomingList({
                groupBlockId: body.groupBlockId,
                guestName: body.guestName,
                guestPhone: body.guestPhone,
                guestEmail: body.guestEmail,
                roomNumber: body.roomNumber,
            });
            return NextResponse.json(result, { status: 201 });
        }

        if (body.action === "RELEASE_EXPIRED") {
            const released = await releaseUnusedGroupBlocks(tenant.hotelId);
            return NextResponse.json({ releasedCount: released.length });
        }

        const group = await createGroupBlock({
            hotelId: tenant.hotelId,
            groupName: body.groupName,
            companyName: body.companyName,
            contactPerson: body.contactPerson,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            startDate: body.startDate,
            endDate: body.endDate,
            cutoffDate: body.cutoffDate,
            totalRooms: body.totalRooms,
            negotiatedRate: body.negotiatedRate,
        });

        return NextResponse.json({ groupBlock: group }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process group block action" },
            { status: 500 }
        );
    }
}
