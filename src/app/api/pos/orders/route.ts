import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const POS_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"];
const ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Delivered", "Completed", "Cancelled"];

type OrderLineInput = {
    menuItemId: string;
    quantity: number;
    notes?: string;
};

async function getPosAccess(request: NextRequest) {
    const session = await getSession();
    if (!session) return null;
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, POS_ROLES)) return null;
    return { session, access };
}

export async function GET(request: NextRequest) {
    const context = await getPosAccess(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const hotelId = resolveRequestedHotel(context.access, searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });

    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const orders = await prisma.posOrder.findMany({
        where: {
            hotelId,
            ...(status && { status }),
            ...(source && { orderSource: source }),
        },
        include: {
            items: {
                include: { menuItem: { select: { name: true, price: true, category: true, isVeg: true } } },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
    });
    return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
    const context = await getPosAccess(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const body = await request.json();
    const hotelId = resolveRequestedHotel(context.access, body.hotelId);
    const items = Array.isArray(body.items) ? body.items as OrderLineInput[] : [];
    if (!hotelId || items.length === 0) {
        return NextResponse.json({ error: "Choose a property and add at least one item" }, { status: 400 });
    }
    if (items.some((item) => !item.menuItemId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
        return NextResponse.json({ error: "Every order line needs a valid quantity" }, { status: 400 });
    }

    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, hotelId },
    });
    if (menuItems.length !== menuItemIds.length) {
        return NextResponse.json({ error: "One or more menu items are unavailable at this property" }, { status: 404 });
    }

    if (body.reservationId) {
        const reservation = await prisma.reservation.findFirst({
            where: { id: body.reservationId, hotelId, deletedAt: null },
            select: { id: true },
        });
        if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const pricedItems = items.map((item) => {
        const menuItem = menuItems.find((candidate) => candidate.id === item.menuItemId)!;
        const quantity = Number(item.quantity);
        const unitPrice = Number(menuItem.price);
        return {
            menuItemId: menuItem.id,
            quantity,
            notes: item.notes?.trim() || null,
            unitPrice,
            lineTotal: unitPrice * quantity,
            menuName: menuItem.name,
        };
    });
    const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

    const stockDeductions: { id: string; required: number }[] = [];
    for (const item of pricedItems) {
        const stock = await prisma.groceryStock.findFirst({
            where: {
                hotelId,
                itemName: { contains: item.menuName.split(" ")[0], mode: "insensitive" },
            },
        });
        if (!stock) continue;
        const required = item.quantity * 0.3;
        if (stock.quantity < required) {
            return NextResponse.json({
                error: `Insufficient stock for ${item.menuName}. ${stock.quantity.toFixed(1)} ${stock.unit} available.`,
            }, { status: 409 });
        }
        stockDeductions.push({ id: stock.id, required });
    }

    const order = await prisma.$transaction(async (tx) => {
        for (const deduction of stockDeductions) {
            const updated = await tx.groceryStock.updateMany({
                where: { id: deduction.id, quantity: { gte: deduction.required } },
                data: { quantity: { decrement: deduction.required } },
            });
            if (updated.count !== 1) throw new Error("STOCK_CHANGED");
        }

        const created = await tx.posOrder.create({
            data: {
                hotelId,
                tableNumber: body.tableNumber?.trim() || null,
                orderSource: body.orderSource || "Walkin",
                reservationId: body.reservationId || null,
                guestName: body.guestName?.trim() || null,
                kotPrinted: Boolean(body.kotPrinted),
                subtotal,
                gstAmount,
                grandTotal,
                paymentStatus: body.reservationId ? "Folio" : "Unpaid",
                status: "Pending",
                items: {
                    create: pricedItems.map((item) => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        notes: item.notes,
                        unitPrice: item.unitPrice,
                        lineTotal: item.lineTotal,
                    })),
                },
            },
            include: { items: { include: { menuItem: true } } },
        });

        if (body.reservationId) {
            const folio = await tx.folio.findFirst({
                where: { reservationId: body.reservationId, hotelId, status: "Open" },
                orderBy: { createdAt: "asc" },
            });
            if (!folio) throw new Error("OPEN_FOLIO_REQUIRED");
            await tx.folioTransaction.create({
                data: {
                    folioId: folio.id,
                    type: "Charge",
                    description: `F&B order ${created.id.slice(0, 8).toUpperCase()}`,
                    amount: grandTotal,
                    referenceId: created.id,
                    postedById: context.session.id,
                },
            });
            await tx.folio.update({
                where: { id: folio.id },
                data: { balance: { increment: grandTotal } },
            });
        }
        return created;
    }).catch((error: Error) => {
        if (["STOCK_CHANGED", "OPEN_FOLIO_REQUIRED"].includes(error.message)) return null;
        throw error;
    });

    if (!order) {
        return NextResponse.json({
            error: "The order could not be committed because stock or the guest folio changed. Refresh and try again.",
        }, { status: 409 });
    }
    return NextResponse.json({ order }, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const context = await getPosAccess(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    if (body.status && !ORDER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    const existing = await prisma.posOrder.findUnique({ where: { id: body.id } });
    if (!existing || !resolveRequestedHotel(context.access, existing.hotelId)) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = await prisma.posOrder.update({
        where: { id: existing.id },
        data: {
            status: body.status || undefined,
            paymentStatus: body.paymentStatus || undefined,
            paymentMode: body.paymentMode || undefined,
            kotPrinted: body.kotPrinted === undefined ? undefined : Boolean(body.kotPrinted),
            completedAt: ["Delivered", "Completed"].includes(body.status) ? new Date() : undefined,
        },
        include: { items: { include: { menuItem: true } } },
    });
    return NextResponse.json({ order });
}
