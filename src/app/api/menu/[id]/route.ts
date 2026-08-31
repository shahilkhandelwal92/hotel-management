import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type Params = Promise<{ id: string }>;
const MENU_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"];

async function getContext(request: NextRequest) {
    const session = await getSession();
    if (!session) return null;
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, MENU_ROLES)) return null;
    return { session, access };
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
    const context = await getContext(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({
        where: { id },
        include: { recipeIngredients: true },
    });
    if (!existing) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    if (!resolveRequestedHotel(context.access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const category = typeof body.category === "string" ? body.category.trim() : existing.category;
    const priceDec = body.price !== undefined ? new Prisma.Decimal(body.price) : existing.price;

    if (!name || !category || priceDec.isNegative()) {
        return NextResponse.json({ error: "Name, category, and a valid price are required" }, { status: 400 });
    }

    const recipeIngredients = Array.isArray(body.recipeIngredients) ? body.recipeIngredients : null;

    const menuItem = await prisma.$transaction(async (tx) => {
        if (recipeIngredients !== null) {
            await tx.recipeIngredient.deleteMany({ where: { menuItemId: id } });
            if (recipeIngredients.length > 0) {
                await tx.recipeIngredient.createMany({
                    data: recipeIngredients.map((r: { stockItemId: string; quantity: number }) => ({
                        menuItemId: id,
                        stockItemId: r.stockItemId,
                        quantity: Number(r.quantity),
                    })),
                });
            }
        }

        return tx.menuItem.update({
            where: { id },
            data: {
                name,
                category,
                price: priceDec,
                isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : existing.isVeg,
                spiceLevel: ["Low", "Medium", "High"].includes(body.spiceLevel) ? body.spiceLevel : existing.spiceLevel,
            },
            include: { recipeIngredients: { include: { stockItem: true } } },
        });
    });

    await logAudit({
        hotelId: existing.hotelId,
        userId: context.session.user.id as string,
        module: "POS",
        action: "UPDATE",
        entityId: menuItem.id,
        oldValue: { name: existing.name, price: existing.price.toString() },
        newValue: { name: menuItem.name, price: priceDec.toString() },
        req: request,
    });

    return NextResponse.json({ menuItem });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    const context = await getContext(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({
        where: { id },
        include: { _count: { select: { posOrderItems: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    if (!resolveRequestedHotel(context.access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing._count.posOrderItems > 0) {
        return NextResponse.json({ error: "This item has order history and cannot be deleted. Edit it instead." }, { status: 422 });
    }

    await prisma.$transaction([
        prisma.recipeIngredient.deleteMany({ where: { menuItemId: id } }),
        prisma.menuItem.delete({ where: { id } }),
    ]);

    await logAudit({
        hotelId: existing.hotelId,
        userId: context.session.user.id as string,
        module: "POS",
        action: "DELETE",
        entityId: id,
        oldValue: { name: existing.name },
        req: request,
    });

    return NextResponse.json({ success: true });
}
