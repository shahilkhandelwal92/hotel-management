import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

type Params = Promise<{ id: string }>;
const REQUEST_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "STAFF", "HOUSEKEEPING"];
const STATUSES = ["Pending", "Approved", "InProgress", "Completed", "Rejected"];

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, REQUEST_ROLES)) {
        return NextResponse.json({ error: "Service request access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    if (body.status && !STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid request status" }, { status: 400 });
    }
    const amount = body.amount === undefined ? undefined : Number(body.amount);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
        return NextResponse.json({ error: "Charge must be a non-negative number" }, { status: 400 });
    }

    const existing = await prisma.guestRequest.findUnique({
        where: { id },
        include: {
            guest: { select: { event: { select: { hotelId: true } } } },
            reservation: { select: { id: true, hotelId: true } },
        },
    });
    const hotelId = existing?.reservation?.hotelId || existing?.guest?.event.hotelId;
    if (!existing || !hotelId || !resolveRequestedHotel(access, hotelId)) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const shouldPostCharge =
        body.status === "Approved" &&
        existing.status !== "Approved" &&
        existing.reservationId &&
        Number(amount || 0) > 0;

    const guestRequest = await prisma.$transaction(async (tx) => {
        const updated = await tx.guestRequest.update({
            where: { id: existing.id },
            data: {
                status: body.status || existing.status,
                amount: amount === undefined ? existing.amount : amount,
            },
        });

        if (shouldPostCharge) {
            const folio = await tx.folio.findFirst({
                where: { reservationId: existing.reservationId!, status: "Open" },
                orderBy: { createdAt: "asc" },
            });
            if (!folio) throw new Error("OPEN_FOLIO_REQUIRED");
            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Charge",
                    description: existing.type || existing.details || "Guest Request",
                    amount: Number(amount),
                    referenceId: existing.id,
                    postedById: session.id,
                },
            });
            await tx.folio.update({
                where: { id: folio.id },
                data: { balance: { increment: Number(amount) } },
            });
        }
        return updated;
    }).catch((error: Error) => {
        if (error.message === "OPEN_FOLIO_REQUIRED") return null;
        throw error;
    });

    if (!guestRequest) {
        return NextResponse.json({ error: "The guest does not have an open folio for this charge" }, { status: 422 });
    }
    return NextResponse.json({ guestRequest });
}
