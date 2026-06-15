import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const STOCK_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"];

async function accessFor(request: NextRequest) {
    const session = await getSession();
    if (!session) return null;
    const access = getRequestAccess(request, session);
    return hasAccessRole(access, STOCK_ROLES) ? access : null;
}

export async function GET(request: NextRequest) {
    const access = await accessFor(request);
    if (!access) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });
    const hotelId = resolveRequestedHotel(access, new URL(request.url).searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });

    const stock = await prisma.groceryStock.findMany({
        where: { hotelId },
        orderBy: { itemName: "asc" },
    });
    return NextResponse.json({ stock });
}

export async function POST(request: NextRequest) {
    const access = await accessFor(request);
    if (!access) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });
    const body = await request.json();
    const hotelId = resolveRequestedHotel(access, body.hotelId);
    const itemName = typeof body.itemName === "string" ? body.itemName.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const quantity = Number(body.quantity);
    const minAlert = Number(body.minAlert);
    if (!hotelId || !itemName || !unit || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minAlert) || minAlert < 0) {
        return NextResponse.json({ error: "Valid item, unit, quantity, and alert level are required" }, { status: 400 });
    }

    const stockItem = await prisma.groceryStock.create({
        data: { hotelId, itemName, unit, quantity, minAlert },
    });
    return NextResponse.json({ stockItem }, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const access = await accessFor(request);
    if (!access) return NextResponse.json({ error: "Restaurant access required" }, { status: 403 });
    const body = await request.json();
    const existing = await prisma.groceryStock.findUnique({ where: { id: body.id } });
    if (!existing || !resolveRequestedHotel(access, existing.hotelId)) {
        return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    }
    const quantity = Number(body.quantity);
    const minAlert = Number(body.minAlert);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minAlert) || minAlert < 0) {
        return NextResponse.json({ error: "Quantity and alert level must be non-negative" }, { status: 400 });
    }
    const stockItem = await prisma.groceryStock.update({
        where: { id: existing.id },
        data: {
            itemName: typeof body.itemName === "string" && body.itemName.trim() ? body.itemName.trim() : existing.itemName,
            unit: typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : existing.unit,
            quantity,
            minAlert,
        },
    });
    return NextResponse.json({ stockItem });
}
