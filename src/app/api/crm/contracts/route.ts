import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createCorporateLead,
    createCorporateContract,
    getApplicableCorporateRate,
} from "@/lib/crmContractEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CONTRACT_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const contractNumber = searchParams.get("contractNumber");
    const standardRate = searchParams.get("standardRate");

    if (contractNumber && standardRate) {
        const rateInfo = await getApplicableCorporateRate(
            tenant.hotelId,
            contractNumber,
            standardRate
        );
        return NextResponse.json(rateInfo);
    }

    const contracts = await prisma.corporateContract.findMany({
        where: { hotelId: tenant.hotelId },
        include: { lead: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.CONTRACT_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "CREATE_LEAD") {
            const lead = await createCorporateLead({
                hotelId: tenant.hotelId,
                companyName: body.companyName,
                contactName: body.contactName,
                contactEmail: body.contactEmail,
                contactPhone: body.contactPhone,
                estimatedValue: body.estimatedValue,
                stage: body.stage,
                assignedTo: body.assignedTo,
                notes: body.notes,
            });
            return NextResponse.json({ lead }, { status: 201 });
        }

        const contract = await createCorporateContract({
            hotelId: tenant.hotelId,
            leadId: body.leadId,
            contractNumber: body.contractNumber,
            companyName: body.companyName,
            startDate: body.startDate,
            endDate: body.endDate,
            negotiatedDiscount: body.negotiatedDiscount,
            fixedRoomRate: body.fixedRoomRate,
            creditLimit: body.creditLimit,
            paymentTerms: body.paymentTerms,
        });

        return NextResponse.json({ contract }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process CRM action" },
            { status: 500 }
        );
    }
}
