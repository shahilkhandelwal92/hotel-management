import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

type Params = Promise<{ id: string }>;
const MENU_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"];

async function getContext(request: NextRequest) {
    const session = await getSession();
    if (!session) return null;
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, MENU_ROLES)) return null;
    return { access };
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
    const context = await getContext(request);
    if (!context) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    if (!resolveRequestedHotel(context.access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const price = Number(body.price);
    if (!name || !category || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Name, category, and a valid price are required" }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.update({
        where: { id },
        data: {
            name,
            category,
            price,
            isVeg: body.isVeg !== false,
            spiceLevel: ["Low", "Medium", "High"].includes(body.spiceLevel) ? body.spiceLevel : "Medium",
        },
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

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
