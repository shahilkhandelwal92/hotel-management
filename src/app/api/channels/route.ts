import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createChannelConnection,
    mapChannelRoom,
    mapChannelRate,
    syncChannelAvailabilityAndRates,
    ingestChannelReservation,
} from "@/lib/channelManagerEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CHANNEL_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const channels = await prisma.channelConnection.findMany({
        where: { hotelId: tenant.hotelId },
        include: { roomMappings: true, rateMappings: true, syncJobs: { take: 5, orderBy: { createdAt: "desc" } } },
        orderBy: { channelName: "asc" },
    });

    return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CHANNEL_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "MAP_ROOM") {
            const mapping = await mapChannelRoom({
                connectionId: body.connectionId,
                roomCategoryId: body.roomCategoryId,
                channelRoomId: body.channelRoomId,
                channelRoomName: body.channelRoomName,
            });
            return NextResponse.json({ mapping });
        }

        if (body.action === "MAP_RATE") {
            const mapping = await mapChannelRate({
                connectionId: body.connectionId,
                ratePlanId: body.ratePlanId,
                channelRateId: body.channelRateId,
                channelRateName: body.channelRateName,
                multiplier: body.multiplier,
            });
            return NextResponse.json({ mapping });
        }

        if (body.action === "SYNC") {
            const syncJob = await syncChannelAvailabilityAndRates(body.connectionId);
            return NextResponse.json({ syncJob });
        }

        if (body.action === "INGEST_RESERVATION") {
            const result = await ingestChannelReservation({
                hotelId: tenant.hotelId,
                channelCode: body.channelCode,
                channelBookingId: body.channelBookingId,
                guestName: body.guestName,
                guestEmail: body.guestEmail,
                arrivalDate: body.arrivalDate,
                departureDate: body.departureDate,
                totalAmount: body.totalAmount,
                commissionAmount: body.commissionAmount,
                rawPayload: body.rawPayload,
            });
            return NextResponse.json(result, { status: 201 });
        }

        const channel = await createChannelConnection({
            hotelId: tenant.hotelId,
            channelCode: body.channelCode,
            channelName: body.channelName,
            hotelIdOnChannel: body.hotelIdOnChannel,
            apiKey: body.apiKey,
            apiSecret: body.apiSecret,
        });

        return NextResponse.json({ channel }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process channel action" },
            { status: 500 }
        );
    }
}
