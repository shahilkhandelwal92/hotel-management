import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

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
    const price = Number(body.price);
    if (!hotelId || !name || !category || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Name, category, and a valid price are required" }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.create({
        data: {
            name,
            category,
            price,
            isVeg: body.isVeg !== false,
            spiceLevel: ["Low", "Medium", "High"].includes(body.spiceLevel) ? body.spiceLevel : "Medium",
            hotelId,
        },
    });
    return NextResponse.json({ menuItem }, { status: 201 });
}
