import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";

type OrderInput = { menuItemId: string; quantity: number; notes?: string };

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "Room service is available after check-in" }, { status: 422 });
    }
    if (!stay.hotel.hasInHouseRestaurant) {
        return NextResponse.json({ error: "In-house dining is not available at this property" }, { status: 422 });
    }

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items as OrderInput[] : [];
    if (items.length === 0) {
        return NextResponse.json({ error: "Add at least one menu item" }, { status: 400 });
    }

    const quantities = items.map((item) => Number(item.quantity));
    if (quantities.some((quantity) => !Number.isInteger(quantity) || quantity < 1 || quantity > 20)) {
        return NextResponse.json({ error: "Item quantities must be between 1 and 20" }, { status: 400 });
    }

    const uniqueIds = [...new Set(items.map((item) => item.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: uniqueIds }, hotelId: stay.hotelId },
    });
    if (menuItems.length !== uniqueIds.length) {
        return NextResponse.json({ error: "One or more menu items are unavailable" }, { status: 404 });
    }

    const pricedItems = items.map((item) => {
        const menuItem = menuItems.find((candidate) => candidate.id === item.menuItemId)!;
        return {
            menuItemId: menuItem.id,
            name: menuItem.name,
            quantity: Number(item.quantity),
            unitPrice: menuItem.price,
            lineTotal: menuItem.price * Number(item.quantity),
            notes: item.notes?.trim() || null,
        };
    });
    const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

    const order = await prisma.$transaction(async (tx) => {
        const folio = await tx.folio.findFirst({
            where: { reservationId: stay.id, status: "Open" },
            orderBy: { createdAt: "asc" },
        });
        if (!folio) throw new Error("OPEN_FOLIO_REQUIRED");

        const createdOrder = await tx.posOrder.create({
            data: {
                hotelId: stay.hotelId,
                reservationId: stay.id,
                guestName: stay.guestName,
                tableNumber: stay.room?.number || null,
                orderSource: "RoomService",
                subtotal,
                gstAmount,
                grandTotal,
                paymentStatus: "Folio",
                status: "Pending",
                items: {
                    create: pricedItems.map((item) => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        lineTotal: item.lineTotal,
                        notes: item.notes,
                    })),
                },
            },
            include: { items: { include: { menuItem: true } } },
        });

        await tx.folioTransaction.create({
            data: {
                folioId: folio.id,
                type: "Charge",
                description: `Room service order ${createdOrder.id.slice(0, 8).toUpperCase()}`,
                amount: grandTotal,
                referenceId: createdOrder.id,
            },
        });
        await tx.folio.update({
            where: { id: folio.id },
            data: { balance: { increment: grandTotal } },
        });
        return createdOrder;
    }).catch((error: Error) => {
        if (error.message === "OPEN_FOLIO_REQUIRED") return null;
        throw error;
    });

    if (!order) {
        return NextResponse.json({ error: "Your room folio is not open. Please contact reception." }, { status: 422 });
    }
    return NextResponse.json({ order }, { status: 201 });
}
