/**
 * Enterprise Corporate CRM & Negotiated Contracts Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages corporate sales pipeline (Leads -> Qualified -> Negotiation -> Won),
 * fixed corporate rates, volume discounts, and contract-linked bookings.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateCorporateLeadParams {
    hotelId: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    estimatedValue?: Prisma.Decimal | number | string;
    stage?: string;
    assignedTo?: string;
    notes?: string;
}

export interface CreateCorporateContractParams {
    hotelId: string;
    leadId?: string;
    contractNumber: string;
    companyName: string;
    startDate: Date | string;
    endDate: Date | string;
    negotiatedDiscount?: Prisma.Decimal | number | string;
    fixedRoomRate?: Prisma.Decimal | number | string;
    creditLimit?: Prisma.Decimal | number | string;
    paymentTerms?: string;
}

export async function createCorporateLead(params: CreateCorporateLeadParams) {
    const {
        hotelId,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        estimatedValue,
        stage = "LEAD",
        assignedTo,
        notes,
    } = params;

    return prisma.corporateLead.create({
        data: {
            hotelId,
            companyName,
            contactName,
            contactEmail,
            contactPhone,
            estimatedValue: estimatedValue ? new Prisma.Decimal(estimatedValue.toString()) : null,
            stage,
            assignedTo: assignedTo ?? null,
            notes: notes ?? null,
        },
    });
}

export async function createCorporateContract(params: CreateCorporateContractParams) {
    const {
        hotelId,
        leadId,
        contractNumber,
        companyName,
        startDate,
        endDate,
        negotiatedDiscount = 0,
        fixedRoomRate,
        creditLimit = 0,
        paymentTerms = "NET_30",
    } = params;

    return prisma.corporateContract.create({
        data: {
            hotelId,
            leadId: leadId ?? null,
            contractNumber,
            companyName,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            negotiatedDiscount: new Prisma.Decimal(negotiatedDiscount.toString()),
            fixedRoomRate: fixedRoomRate ? new Prisma.Decimal(fixedRoomRate.toString()) : null,
            creditLimit: new Prisma.Decimal(creditLimit.toString()),
            paymentTerms,
            status: "ACTIVE",
        },
    });
}

export async function getApplicableCorporateRate(
    hotelId: string,
    contractNumber: string,
    standardRate: Prisma.Decimal | number | string
): Promise<{ effectiveRate: Prisma.Decimal; discountApplied: Prisma.Decimal }> {
    const contract = await prisma.corporateContract.findFirst({
        where: {
            hotelId,
            contractNumber,
            status: "ACTIVE",
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
        },
    });

    const decStandard = new Prisma.Decimal(standardRate.toString());

    if (!contract) {
        return { effectiveRate: decStandard, discountApplied: new Prisma.Decimal(0) };
    }

    if (contract.fixedRoomRate && contract.fixedRoomRate.gt(0)) {
        return {
            effectiveRate: contract.fixedRoomRate,
            discountApplied: decStandard.minus(contract.fixedRoomRate),
        };
    }

    if (contract.negotiatedDiscount.gt(0)) {
        const discount = decStandard.mul(contract.negotiatedDiscount).div(100);
        return {
            effectiveRate: decStandard.minus(discount),
            discountApplied: discount,
        };
    }

    return { effectiveRate: decStandard, discountApplied: new Prisma.Decimal(0) };
}
