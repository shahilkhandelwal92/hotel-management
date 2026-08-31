import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// GET /api/tax-config
export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.TAX_CONFIG_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const { searchParams } = new URL(req.url);
    const financialYear = searchParams.get("financialYear");

    try {
        const configs = await prisma.taxConfiguration.findMany({
            where: {
                hotelId,
                ...(financialYear ? { financialYear } : {}),
            },
            orderBy: { financialYear: "desc" },
        });

        return NextResponse.json(configs);
    } catch (error) {
        console.error("Error fetching tax configurations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/tax-config
export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.TAX_CONFIG_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;

    try {
        const body = await req.json();
        const {
            financialYear,
            taxType,
            taxRegistrationNumber,
            companyState,
            roomTaxPct,
            restaurantTaxPct,
            barTaxPct,
            amenityTaxPct,
            tdsPct,
            isTaxApplicable,
        } = body;

        if (!financialYear) {
            return NextResponse.json({ error: "financialYear is required" }, { status: 400 });
        }

        const config = await prisma.taxConfiguration.create({
            data: {
                hotelId,
                financialYear: String(financialYear).trim(),
                taxType: taxType || "GST",
                taxRegistrationNumber: taxRegistrationNumber?.trim() || null,
                companyState: companyState?.trim() || null,
                roomTaxPct: roomTaxPct !== undefined ? Number(roomTaxPct) : 0,
                restaurantTaxPct: restaurantTaxPct !== undefined ? Number(restaurantTaxPct) : 0,
                barTaxPct: barTaxPct !== undefined ? Number(barTaxPct) : 0,
                amenityTaxPct: amenityTaxPct !== undefined ? Number(amenityTaxPct) : 0,
                tdsPct: tdsPct !== undefined ? Number(tdsPct) : 0,
                isTaxApplicable: isTaxApplicable !== undefined ? Boolean(isTaxApplicable) : true,
            },
        });

        await logAudit({
            hotelId,
            userId: tenant.userId,
            module: "NightAudit",
            action: "CREATE",
            entityId: config.id,
            newValue: { financialYear: config.financialYear, taxType: config.taxType },
            req,
        });

        return NextResponse.json(config, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A configuration for this financial year already exists for this hotel." }, { status: 409 });
        }
        console.error("Error creating tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
