import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const POS_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER", "FRONT_DESK"];
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
        return NextResponse.json({ error: "Every order line needs a valid positive quantity" }, { status: 400 });
    }

    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, hotelId },
        include: {
            recipeIngredients: {
                include: { stockItem: true },
            },
        },
    });
    if (menuItems.length !== menuItemIds.length) {
        return NextResponse.json({ error: "One or more menu items are unavailable at this property" }, { status: 404 });
    }

    if (body.reservationId) {
        const reservation = await prisma.reservation.findFirst({
            where: { id: body.reservationId, hotelId, deletedAt: null },
            select: { id: true, status: true },
        });
        if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        if (reservation.status !== "CheckedIn") {
            return NextResponse.json({ error: "Room charge is only available for active checked-in reservations" }, { status: 422 });
        }
    }

    // 1. Calculate priced lines with exact Decimal
    let subtotalDec = new Prisma.Decimal(0);
    const pricedItems = items.map((item) => {
        const menuItem = menuItems.find((candidate) => candidate.id === item.menuItemId)!;
        const quantity = Number(item.quantity);
        const unitPriceDec = new Prisma.Decimal(menuItem.price);
        const lineTotalDec = unitPriceDec.times(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        subtotalDec = subtotalDec.plus(lineTotalDec);

        return {
            menuItemId: menuItem.id,
            quantity,
            notes: item.notes?.trim() || null,
            unitPrice: unitPriceDec,
            lineTotal: lineTotalDec,
            menuItem,
        };
    });

    // GST calculation (5% standard restaurant rate) with Decimal
    const gstRateDec = new Prisma.Decimal(0.05);
    const gstAmountDec = subtotalDec.times(gstRateDec).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const grandTotalDec = subtotalDec.plus(gstAmountDec);

    // 2. Aggregate recipe-based ingredient consumption across all order lines
    const requiredStockMap = new Map<string, {
        stockItem: { id: string; item: string; itemName: string; quantity: number; unit: string };
        requiredQuantity: number;
        menuItemNames: string[];
    }>();

    for (const item of pricedItems) {
        for (const recipe of item.menuItem.recipeIngredients) {
            const stock = recipe.stockItem;
            const ingredientNeeded = recipe.quantity * item.quantity;

            const existing = requiredStockMap.get(stock.id);
            if (existing) {
                existing.requiredQuantity += ingredientNeeded;
                if (!existing.menuItemNames.includes(item.menuItem.name)) {
                    existing.menuItemNames.push(item.menuItem.name);
                }
            } else {
                requiredStockMap.set(stock.id, {
                    stockItem: stock,
                    requiredQuantity: ingredientNeeded,
                    menuItemNames: [item.menuItem.name],
                });
            }
        }
    }

    // 3. Verify current stock availability before transaction
    for (const [stockId, stockReq] of requiredStockMap.entries()) {
        const currentStock = await prisma.groceryStock.findUnique({
            where: { id: stockId },
            select: { id: true, item: true, itemName: true, quantity: true, unit: true },
        });

        if (!currentStock || currentStock.quantity < stockReq.requiredQuantity) {
            const available = currentStock ? currentStock.quantity : 0;
            const unit = currentStock ? currentStock.unit : stockReq.stockItem.unit;
            const stockName = currentStock?.itemName || currentStock?.item || stockReq.stockItem.itemName || stockReq.stockItem.item;
            return NextResponse.json({
                error: `Insufficient stock for ingredient "${stockName}" (required for ${stockReq.menuItemNames.join(", ")}). Available: ${available} ${unit}, Required: ${stockReq.requiredQuantity} ${unit}.`,
            }, { status: 409 });
        }
    }

    // 4. Atomic Transaction: Deduct stock + Record movements + Create order + Post to folio
    try {
        const order = await prisma.$transaction(async (tx) => {
            // Deduct stock and create movement records
            for (const [stockId, stockReq] of requiredStockMap.entries()) {
                const updated = await tx.groceryStock.updateMany({
                    where: { id: stockId, quantity: { gte: stockReq.requiredQuantity } },
                    data: { quantity: { decrement: stockReq.requiredQuantity } },
                });

                if (updated.count !== 1) {
                    throw new Error(`CONCURRENT_STOCK_CONFLICT:${stockReq.stockItem.itemName || stockReq.stockItem.item}`);
                }

                await tx.groceryStockMovement.create({
                    data: {
                        hotelId,
                        stockItemId: stockId,
                        movementType: "OUT",
                        quantity: stockReq.requiredQuantity,
                        reason: `POS Order Recipe Deduction: ${stockReq.menuItemNames.join(", ")}`,
                        performedBy: context.session.id,
                    },
                });
            }

            // Create POS Order
            const created = await tx.posOrder.create({
                data: {
                    hotelId,
                    tableNumber: body.tableNumber?.trim() || null,
                    orderSource: body.orderSource || "Walkin",
                    reservationId: body.reservationId || null,
                    guestName: body.guestName?.trim() || null,
                    kotPrinted: Boolean(body.kotPrinted),
                    subtotal: subtotalDec,
                    gstAmount: gstAmountDec,
                    grandTotal: grandTotalDec,
                    paymentStatus: body.reservationId ? "Folio" : (body.paymentStatus || "Unpaid"),
                    paymentMode: body.paymentMode || null,
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

            // If charged to room reservation, post charge to open folio
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
                        description: `Restaurant Order #${created.id.slice(0, 8).toUpperCase()}${created.tableNumber ? ` (Table ${created.tableNumber})` : ""}`,
                        amount: grandTotalDec,
                        referenceId: created.id,
                        postedById: context.session.id,
                    },
                });

                await tx.folio.update({
                    where: { id: folio.id },
                    data: { balance: { increment: grandTotalDec } },
                });
            }

            return created;
        });

        await logAudit({
            hotelId,
            userId: context.session.id,
            module: "POS",
            action: "CREATE",
            entityId: order.id,
            newValue: { grandTotal: grandTotalDec.toString(), orderSource: order.orderSource },
            req: request,
        });

        return NextResponse.json({ order }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/pos/orders transaction error:", error);
        if (error.message?.startsWith("CONCURRENT_STOCK_CONFLICT:")) {
            const item = error.message.split(":")[1];
            return NextResponse.json({
                error: `Stock for ${item} changed concurrently. Please refresh and try again.`,
            }, { status: 409 });
        }
        if (error.message === "OPEN_FOLIO_REQUIRED") {
            return NextResponse.json({
                error: "No open guest folio found for this reservation. Charge to room cannot be completed.",
            }, { status: 422 });
        }
        return NextResponse.json({ error: "Failed to place restaurant order" }, { status: 500 });
    }
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

    await logAudit({
        hotelId: existing.hotelId,
        userId: context.session.id,
        module: "POS",
        action: "UPDATE",
        entityId: order.id,
        oldValue: { status: existing.status, paymentStatus: existing.paymentStatus },
        newValue: { status: order.status, paymentStatus: order.paymentStatus },
        req: request,
    });

    return NextResponse.json({ order });
}
