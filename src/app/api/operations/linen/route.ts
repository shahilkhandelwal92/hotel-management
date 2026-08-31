import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { upsertLinenStock } from "@/lib/linenMinibarEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LINEN_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const linenItems = await prisma.linenItem.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ linenItems });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LINEN_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const linen = await upsertLinenStock({
            hotelId: tenant.hotelId,
            name: body.name,
            code: body.code,
            parStock: body.parStock,
            totalStock: body.totalStock,
            inRooms: body.inRooms,
            inLinenRoom: body.inLinenRoom,
            inLaundry: body.inLaundry,
            damaged: body.damaged,
        });

        return NextResponse.json({ linenItem: linen });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Linen operation failed" },
            { status: 500 }
        );
    }
}
