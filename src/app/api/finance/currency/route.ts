import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    upsertExchangeRate,
    convertCurrency,
} from "@/lib/currencyEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CURRENCY_RATE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const amount = searchParams.get("amount");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (amount && from && to) {
        const conversion = await convertCurrency(
            amount,
            from,
            to,
            tenant.hotelId
        );
        return NextResponse.json(conversion);
    }

    const rates = await prisma.currencyRate.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: { effectiveDate: "desc" },
    });

    return NextResponse.json({ currencyRates: rates });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CURRENCY_RATE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();
        const rate = await upsertExchangeRate({
            hotelId: tenant.hotelId,
            currencyCode: body.currencyCode,
            rateToBase: body.rateToBase,
            effectiveDate: body.effectiveDate,
        });

        return NextResponse.json({ currencyRate: rate }, { status: 200 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to update currency rate" },
            { status: 500 }
        );
    }
}
