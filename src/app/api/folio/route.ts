import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertDayNotLocked, logAudit } from "@/lib/audit";



// ── GET /api/folio ────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get("reservationId");

    // Tenant isolation — always from header
    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";
    const hotelId = isSA ? searchParams.get("hotelId") : injectedHotelId;

    if (reservationId) {
        const folios = await prisma.folio.findMany({
            where: {
                reservationId,
                ...(hotelId ? { hotelId } : {}),
            },
            include: {
                transactions: { orderBy: { postedAt: "asc" } },
                reservation: { select: { bookingRef: true, guestName: true, status: true } },
            },
        });
        return NextResponse.json({ folios });
    }

    if (hotelId) {
        const folios = await prisma.folio.findMany({
            where: { hotelId, status: "Open" },
            include: {
                reservation: { select: { bookingRef: true, guestName: true, checkIn: true, checkOut: true, status: true } },
                transactions: { orderBy: { postedAt: "desc" }, take: 5 },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ folios });
    }

    return NextResponse.json({ error: "reservationId or hotelId required" }, { status: 400 });
}

// ── POST /api/folio ───────────────────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";

    const body = await req.json();
    const { mode } = body; // "create_folio" | "post_transaction"

    if (mode === "create_folio") {
        const { reservationId, folioType } = body;
        const hotelId = isSA ? (body.hotelId ?? injectedHotelId) : injectedHotelId;
        if (!hotelId) return NextResponse.json({ error: "Hotel context missing" }, { status: 403 });
        if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

        // Guard: reservation must exist and not be checked out
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            select: { status: true, hotelId: true },
        });
        if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        if (reservation.hotelId !== hotelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (reservation.status === "CheckedOut" || reservation.status === "Cancelled") {
            return NextResponse.json({
                error: `Cannot create folio for a ${reservation.status} reservation. Guest has already departed.`,
            }, { status: 422 });
        }

        // Night audit lock check
        const lock = await assertDayNotLocked(hotelId, new Date(), isSA);
        if (lock) return NextResponse.json({ error: lock }, { status: 423 });

        const folio = await prisma.folio.create({
            data: { hotelId, reservationId, folioType: folioType ?? "Room", balance: 0 },
        });
        return NextResponse.json({ folio }, { status: 201 });
    }

    if (mode === "post_transaction") {
        const { folioId, type, description, amount, referenceId, overrideReason } = body;

        const folio = await prisma.folio.findUnique({
            where: { id: folioId },
            include: { reservation: { select: { status: true } } },
        });
        if (!folio) return NextResponse.json({ error: "Folio not found" }, { status: 404 });
        if (!isSA && folio.hotelId !== injectedHotelId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // ── 1. Folio status check ──────────────────────────────────
        if (folio.status !== "Open") {
            return NextResponse.json({
                error: `Folio is ${folio.status} — cannot post new transactions.`,
            }, { status: 422 });
        }

        // ── 2. Reservation CheckedOut guard ───────────────────────
        // Block new charges on a checked-out reservation (accounting integrity)
        const resStatus = folio.reservation?.status;
        if (resStatus === "CheckedOut" || resStatus === "Cancelled") {
            if (type === "Charge") {
                return NextResponse.json({
                    error: `Cannot post charges to a ${resStatus} reservation. Guest has departed. Use a credit note or refund instead.`,
                }, { status: 422 });
            }
            // Refunds/adjustments allowed if SA provides reason
            if (!isSA && type !== "Refund") {
                return NextResponse.json({
                    error: "Reservation is checked out. Only refunds are permitted without admin override.",
                }, { status: 422 });
            }
        }

        // ── 3. Night Audit day lock ───────────────────────────────
        const lock = await assertDayNotLocked(folio.hotelId, new Date(), isSA, overrideReason);
        if (lock) return NextResponse.json({ error: lock }, { status: 423 });

        const allowedTypes = ["Charge", "Payment", "Refund", "Adjustment"];
        if (!allowedTypes.includes(type)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }
        if (typeof description !== "string" || !description.trim()) {
            return NextResponse.json({ error: "Description is required" }, { status: 400 });
        }

        const rawAmount = Number(amount);
        if (!Number.isFinite(rawAmount) || rawAmount === 0) {
            return NextResponse.json({ error: "Amount must be a non-zero number" }, { status: 400 });
        }
        const parsedAmount = type === "Payment" || type === "Refund"
            ? -Math.abs(rawAmount)
            : type === "Charge"
                ? Math.abs(rawAmount)
                : rawAmount;

        // ── 4. Atomic transaction ─────────────────────────────────
        const [tx, updatedFolio] = await prisma.$transaction([
            prisma.folioTransaction.create({
                data: {
                    folioId,
                    type,
                    description,
                    amount: parsedAmount,
                    referenceId,
                    postedById: session.user.id as string,
                },
            }),
            prisma.folio.update({
                where: { id: folioId },
                data: { balance: { increment: parsedAmount } },
            }),
        ]);

        await logAudit({
            hotelId: folio.hotelId,
            userId: session.user.id as string,
            module: "Folio",
            action: "UPDATE",
            entityId: folio.id,
            oldValue: { balance: folio.balance },
            newValue: { balance: updatedFolio.balance, transactionType: type, amount: parsedAmount },
            req,
        });

        return NextResponse.json({ transaction: tx, folio: updatedFolio });
    }

    return NextResponse.json({ error: "Invalid mode. Use create_folio or post_transaction" }, { status: 400 });
}

// ── PUT /api/folio — close/transfer ──────────────────────────
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const injectedHotelId = req.headers.get("x-hotel-id");
    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";
    const { id, status, transferToFolioId } = await req.json();

    const source = await prisma.folio.findUnique({ where: { id }, include: { transactions: true } });
    if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isSA && source.hotelId !== injectedHotelId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status === "Transferred" && transferToFolioId) {
        if (source.status !== "Open") {
            return NextResponse.json({ error: `Cannot transfer a ${source.status} folio` }, { status: 422 });
        }
        if (transferToFolioId === source.id) {
            return NextResponse.json({ error: "Source and destination folios must be different" }, { status: 400 });
        }
        const destination = await prisma.folio.findUnique({ where: { id: transferToFolioId } });
        if (!destination || destination.hotelId !== source.hotelId) {
            return NextResponse.json({ error: "Destination folio not found for this hotel" }, { status: 404 });
        }
        if (destination.status !== "Open") {
            return NextResponse.json({ error: "Destination folio must be open" }, { status: 422 });
        }

        await prisma.$transaction([
            prisma.folio.update({ where: { id }, data: { status: "Transferred", balance: 0 } }),
            prisma.folio.update({
                where: { id: transferToFolioId },
                data: { balance: { increment: source.balance } },
            }),
            prisma.folioTransaction.create({
                data: {
                    folioId: transferToFolioId,
                    type: "Transfer",
                    description: `Transfer from folio ${id}`,
                    amount: source.balance,
                    referenceId: id,
                    postedById: session.user.id as string,
                },
            }),
        ]);

        await logAudit({
            hotelId: source.hotelId,
            userId: session.user.id as string,
            module: "Folio",
            action: "UPDATE",
            entityId: source.id,
            oldValue: { status: source.status, balance: source.balance },
            newValue: { status: "Transferred", balance: 0, transferToFolioId },
            req,
        });
        return NextResponse.json({ success: true });
    }

    if (!["Open", "Closed"].includes(status)) {
        return NextResponse.json({ error: "Invalid folio status" }, { status: 400 });
    }
    if (status === "Closed" && Math.abs(source.balance) >= 0.01) {
        return NextResponse.json({ error: "A folio with an outstanding balance cannot be closed" }, { status: 422 });
    }

    const folio = await prisma.folio.update({ where: { id }, data: { status } });
    await logAudit({
        hotelId: source.hotelId,
        userId: session.user.id as string,
        module: "Folio",
        action: "UPDATE",
        entityId: source.id,
        oldValue: { status: source.status },
        newValue: { status: folio.status },
        req,
    });
    return NextResponse.json({ folio });
}
