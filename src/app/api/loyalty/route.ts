import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createLoyaltyAccount,
    adjustLoyaltyPoints,
} from "@/lib/loyaltyEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LOYALTY_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get("guestId");

    const accounts = await prisma.loyaltyAccount.findMany({
        where: {
            hotelId: tenant.hotelId,
            ...(guestId ? { guestId } : {}),
        },
        include: { transactions: { take: 10, orderBy: { createdAt: "desc" } } },
        orderBy: { pointsBalance: "desc" },
    });

    return NextResponse.json({ loyaltyAccounts: accounts });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.LOYALTY_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "ADJUST_POINTS") {
            const result = await adjustLoyaltyPoints({
                hotelId: tenant.hotelId,
                guestId: body.guestId,
                type: body.type,
                points: body.points,
                description: body.description ?? "Points adjustment",
                referenceId: body.referenceId,
            });
            return NextResponse.json(result);
        }

        const account = await createLoyaltyAccount({
            hotelId: tenant.hotelId,
            guestId: body.guestId,
            memberNumber: body.memberNumber ?? `LOYAL-${Date.now().toString().slice(-6)}`,
            tier: body.tier,
        });

        return NextResponse.json({ loyaltyAccount: account }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process loyalty action" },
            { status: 500 }
        );
    }
}
