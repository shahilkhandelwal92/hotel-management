import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createWaitlistEntry,
    convertWaitlistToReservation,
} from "@/lib/waitlistEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.WAITLIST_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const waitlist = await prisma.reservationWaitlist.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ waitlist });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.WAITLIST_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "CONVERT") {
            const result = await convertWaitlistToReservation(body.waitlistId, body.reservationId);
            return NextResponse.json(result);
        }

        const entry = await createWaitlistEntry({
            hotelId: tenant.hotelId,
            guestName: body.guestName,
            guestPhone: body.guestPhone,
            guestEmail: body.guestEmail,
            roomCategoryId: body.roomCategoryId,
            arrivalDate: body.arrivalDate,
            departureDate: body.departureDate,
            numberOfRooms: body.numberOfRooms,
            priority: body.priority,
            notes: body.notes,
        });

        return NextResponse.json({ waitlistEntry: entry }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process waitlist action" },
            { status: 500 }
        );
    }
}
