import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

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

    const amountDec = body.amount !== undefined
        ? new Prisma.Decimal(body.amount)
        : (existing.amount ? new Prisma.Decimal(existing.amount) : new Prisma.Decimal(0));

    if (amountDec.isNegative()) {
        return NextResponse.json({ error: "Charge must be a non-negative number" }, { status: 400 });
    }

    const shouldPostCharge =
        body.status === "Approved" &&
        existing.status !== "Approved" &&
        existing.reservationId &&
        amountDec.greaterThan(0);

    try {
        const guestRequest = await prisma.$transaction(async (tx) => {
            const updated = await tx.guestRequest.update({
                where: { id: existing.id },
                data: {
                    status: body.status || existing.status,
                    amount: amountDec,
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
                        amount: amountDec,
                        referenceId: existing.id,
                        postedById: session.id,
                    },
                });

                await tx.folio.update({
                    where: { id: folio.id },
                    data: { balance: { increment: amountDec } },
                });
            }
            return updated;
        });

        await logAudit({
            hotelId,
            userId: session.id,
            module: "Reservation",
            action: "UPDATE",
            entityId: id,
            oldValue: { status: existing.status, amount: existing.amount ? existing.amount.toString() : "0" },
            newValue: { status: guestRequest.status, amount: amountDec.toString() },
            req: request,
        });

        return NextResponse.json({ guestRequest });
    } catch (error: any) {
        if (error.message === "OPEN_FOLIO_REQUIRED") {
            return NextResponse.json({ error: "The guest does not have an open folio for this charge" }, { status: 422 });
        }
        console.error("PATCH /api/requests/[id] error:", error);
        return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }
}
