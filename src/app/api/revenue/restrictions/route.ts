import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    setRateRestriction,
    validateBookingRestrictions,
} from "@/lib/revenueEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.RATE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    if (checkIn && checkOut) {
        const validation = await validateBookingRestrictions({
            hotelId: tenant.hotelId,
            roomCategoryId: searchParams.get("roomCategoryId") ?? undefined,
            ratePlanId: searchParams.get("ratePlanId") ?? undefined,
            checkIn,
            checkOut,
        });
        return NextResponse.json(validation);
    }

    const restrictions = await prisma.rateRestriction.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: { date: "asc" },
        take: 100,
    });

    return NextResponse.json({ restrictions });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.RATE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const restriction = await setRateRestriction({
            hotelId: tenant.hotelId,
            roomCategoryId: body.roomCategoryId,
            ratePlanId: body.ratePlanId,
            date: body.date,
            minLOS: body.minLOS,
            maxLOS: body.maxLOS,
            closedToArrival: body.closedToArrival,
            closedToDeparture: body.closedToDeparture,
            stopSell: body.stopSell,
        });

        return NextResponse.json({ restriction }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to set rate restriction" },
            { status: 500 }
        );
    }
}
