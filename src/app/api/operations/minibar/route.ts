import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createMinibarItem,
    recordMinibarConsumption,
} from "@/lib/linenMinibarEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.MINIBAR_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const items = await prisma.minibarItem.findMany({
        where: { hotelId: tenant.hotelId },
        include: { consumptions: { take: 10, orderBy: { createdAt: "desc" } } },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ minibarItems: items });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.MINIBAR_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "RECORD_CONSUMPTION") {
            const consumption = await recordMinibarConsumption({
                hotelId: tenant.hotelId,
                roomId: body.roomId,
                reservationId: body.reservationId,
                minibarItemId: body.minibarItemId,
                quantity: body.quantity,
                unitPrice: body.unitPrice,
                billToFolio: body.billToFolio,
                inspectedById: auth.userId,
            });
            return NextResponse.json({ consumption }, { status: 201 });
        }

        const item = await createMinibarItem({
            hotelId: tenant.hotelId,
            name: body.name,
            code: body.code,
            price: body.price,
            costPrice: body.costPrice,
            stockQty: body.stockQty,
        });

        return NextResponse.json({ minibarItem: item }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Minibar operation failed" },
            { status: 500 }
        );
    }
}
