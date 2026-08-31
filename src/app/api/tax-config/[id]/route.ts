import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ id: string }>;

// PUT /api/tax-config/[id]
export async function PUT(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.TAX_CONFIG_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;

        // Verify configuration belongs to user's hotel property (IDOR prevention)
        const existing = await prisma.taxConfiguration.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Tax configuration not found for this property" }, { status: 404 });

        const body = await req.json();
        const {
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

        const config = await prisma.taxConfiguration.update({
            where: { id },
            data: {
                ...(taxType !== undefined && { taxType }),
                ...(taxRegistrationNumber !== undefined && { taxRegistrationNumber: taxRegistrationNumber?.trim() || null }),
                ...(companyState !== undefined && { companyState: companyState?.trim() || null }),
                ...(roomTaxPct !== undefined && { roomTaxPct: Number(roomTaxPct) }),
                ...(restaurantTaxPct !== undefined && { restaurantTaxPct: Number(restaurantTaxPct) }),
                ...(barTaxPct !== undefined && { barTaxPct: Number(barTaxPct) }),
                ...(amenityTaxPct !== undefined && { amenityTaxPct: Number(amenityTaxPct) }),
                ...(tdsPct !== undefined && { tdsPct: Number(tdsPct) }),
                ...(isTaxApplicable !== undefined && { isTaxApplicable: Boolean(isTaxApplicable) }),
            },
        });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "NightAudit",
            action: "UPDATE",
            entityId: config.id,
            oldValue: { financialYear: existing.financialYear, taxType: existing.taxType },
            newValue: { financialYear: config.financialYear, taxType: config.taxType },
            req,
        });

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error updating tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/tax-config/[id]
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.TAX_CONFIG_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;

        // Verify configuration belongs to user's hotel property (IDOR prevention)
        const existing = await prisma.taxConfiguration.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });
        if (!existing) return NextResponse.json({ error: "Tax configuration not found for this property" }, { status: 404 });

        await prisma.taxConfiguration.delete({ where: { id } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "NightAudit",
            action: "DELETE",
            entityId: id,
            oldValue: { financialYear: existing.financialYear },
            req,
        });

        return NextResponse.json({ success: true, message: "Tax configuration deleted" });
    } catch (error: any) {
        console.error("Error deleting tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
