import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.VENUE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;

        // Verify venue belongs to user's property (IDOR prevention)
        const venue = await prisma.eventVenue.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });

        if (!venue) {
            return NextResponse.json({ error: "Venue not found for this property" }, { status: 404 });
        }

        // Check if there are bookings for this venue
        const bookingCount = await prisma.partyBooking.count({ where: { venueId: id } });
        if (bookingCount > 0) {
            return NextResponse.json({ error: "Cannot delete venue with existing bookings" }, { status: 400 });
        }

        await prisma.eventVenue.delete({ where: { id } });

        await logAudit({
            hotelId: venue.hotelId,
            userId: tenant.userId,
            module: "Events",
            action: "DELETE",
            entityId: id,
            oldValue: { name: venue.name, capacity: venue.capacity },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/venues/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete venue" }, { status: 500 });
    }
}
