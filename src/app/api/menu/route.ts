import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const MENU_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"];

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, MENU_ROLES)) {
        return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });
    }

    const hotelId = resolveRequestedHotel(access, new URL(request.url).searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });

    const menuItems = await prisma.menuItem.findMany({
        where: { hotelId },
        include: {
            recipeIngredients: {
                include: { stockItem: true },
            },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ menuItems });
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, MENU_ROLES)) {
        return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });
    }

    const body = await request.json();
    const hotelId = resolveRequestedHotel(access, body.hotelId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const priceDec = new Prisma.Decimal(body.price || 0);

    if (!hotelId || !name || !category || priceDec.isNegative()) {
        return NextResponse.json({ error: "Name, category, and a valid positive price are required" }, { status: 400 });
    }

    const recipeIngredients = Array.isArray(body.recipeIngredients) ? body.recipeIngredients : [];

    const menuItem = await prisma.$transaction(async (tx) => {
        const created = await tx.menuItem.create({
            data: {
                name,
                category,
                price: priceDec,
                isVeg: body.isVeg !== false,
                spiceLevel: ["Low", "Medium", "High"].includes(body.spiceLevel) ? body.spiceLevel : "Medium",
                hotelId,
                ...(recipeIngredients.length > 0
                    ? {
                        recipeIngredients: {
                            create: recipeIngredients.map((r: { stockItemId: string; quantity: number }) => ({
                                stockItemId: r.stockItemId,
                                quantity: Number(r.quantity),
                            })),
                        },
                    }
                    : {}),
            },
            include: { recipeIngredients: { include: { stockItem: true } } },
        });

        return created;
    });

    await logAudit({
        hotelId,
        userId: session.user.id as string,
        module: "POS",
        action: "CREATE",
        entityId: menuItem.id,
        newValue: { name: menuItem.name, price: priceDec.toString(), category: menuItem.category },
        req: request,
    });

    return NextResponse.json({ menuItem }, { status: 201 });
}
