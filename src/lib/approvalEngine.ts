/**
 * Centralized Enterprise Approval Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages approval workflows for discounts, refunds, rate overrides,
 * invoice cancellations, purchase orders, stock adjustments, cashier variances,
 * credit limits, and complimentary rooms.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ApprovalActionType =
    | "DISCOUNT"
    | "REFUND"
    | "RATE_OVERRIDE"
    | "INVOICE_CANCEL"
    | "PO_APPROVE"
    | "STOCK_ADJUST"
    | "CASHIER_VARIANCE"
    | "CREDIT_LIMIT"
    | "COMP_ROOM"
    | "WRITE_OFF";

export interface RequestApprovalParams {
    hotelId: string;
    requesterId: string;
    actionType: ApprovalActionType;
    entityType: string;
    entityId: string;
    requestedAmount?: Prisma.Decimal | number | string | null;
    reason: string;
    metadata?: Record<string, unknown>;
}

export interface DecideApprovalParams {
    hotelId: string;
    requestId: string;
    actorId: string;
    actorRoles: string[];
    action: "APPROVE" | "REJECT" | "CANCEL";
    comments?: string;
}

export async function requestApproval(params: RequestApprovalParams) {
    const { hotelId, requesterId, actionType, entityType, entityId, reason, metadata } = params;
    const requestedAmount = params.requestedAmount ? new Prisma.Decimal(params.requestedAmount.toString()) : null;

    // Find active policy for this hotel and actionType
    const policy = await prisma.approvalPolicy.findFirst({
        where: {
            hotelId,
            actionType,
            isActive: true,
        },
    });

    // Check auto-approval threshold if configured
    if (policy?.autoApproveBelow && requestedAmount && requestedAmount.lt(policy.autoApproveBelow)) {
        const autoRequest = await prisma.approvalRequest.create({
            data: {
                hotelId,
                policyId: policy.id,
                requesterId,
                actionType,
                entityType,
                entityId,
                requestedAmount,
                reason,
                status: "APPROVED",
                totalSteps: 1,
                currentStep: 1,
                metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                actions: {
                    create: {
                        actorId: "SYSTEM_AUTO_APPROVE",
                        action: "APPROVED",
                        comments: `Auto-approved below threshold ${policy.autoApproveBelow}`,
                    },
                },
            },
            include: { steps: true, actions: true },
        });
        return { autoApproved: true, request: autoRequest };
    }

    const requiredRole = policy?.requiredRole ?? "HOTEL_ADMIN";
    const totalSteps = policy?.approvalLevels ?? 1;

    const request = await prisma.approvalRequest.create({
        data: {
            hotelId,
            policyId: policy?.id,
            requesterId,
            actionType,
            entityType,
            entityId,
            requestedAmount,
            reason,
            status: "PENDING",
            totalSteps,
            currentStep: 1,
            metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            steps: {
                create: Array.from({ length: totalSteps }, (_, i) => ({
                    stepNumber: i + 1,
                    targetRole: requiredRole,
                    status: "PENDING",
                })),
            },
            actions: {
                create: {
                    actorId: requesterId,
                    action: "SUBMITTED",
                    comments: reason,
                },
            },
        },
        include: {
            steps: true,
            actions: true,
        },
    });

    return { autoApproved: false, request };
}

export async function decideApproval(params: DecideApprovalParams) {
    const { hotelId, requestId, actorId, actorRoles, action, comments } = params;

    const approvalReq = await prisma.approvalRequest.findFirst({
        where: { id: requestId, hotelId },
        include: { steps: { orderBy: { stepNumber: "asc" } } },
    });

    if (!approvalReq) {
        throw new Error("Approval request not found");
    }

    if (approvalReq.status !== "PENDING") {
        throw new Error(`Cannot decide request with status ${approvalReq.status}`);
    }

    const currentStep = approvalReq.steps.find((s) => s.stepNumber === approvalReq.currentStep && s.status === "PENDING");
    if (!currentStep) {
        throw new Error("No pending step found for this approval request");
    }

    const isAuthorized =
        actorRoles.includes("SUPER_ADMIN") ||
        actorRoles.includes("OWNER") ||
        actorRoles.includes("HOTEL_ADMIN") ||
        actorRoles.includes(currentStep.targetRole);

    if (!isAuthorized) {
        throw new Error(`User does not have required role (${currentStep.targetRole}) to approve this step`);
    }

    if (action === "REJECT" || action === "CANCEL") {
        const updated = await prisma.$transaction(async (tx) => {
            await tx.approvalStep.update({
                where: { id: currentStep.id },
                data: {
                    status: action === "REJECT" ? "REJECTED" : "CANCELLED",
                    reviewedBy: actorId,
                    reviewedAt: new Date(),
                    comments: comments ?? null,
                },
            });

            await tx.approvalAction.create({
                data: {
                    requestId,
                    actorId,
                    action: action === "REJECT" ? "REJECTED" : "CANCELLED",
                    comments: comments ?? null,
                },
            });

            return tx.approvalRequest.update({
                where: { id: requestId },
                data: { status: action === "REJECT" ? "REJECTED" : "CANCELLED" },
                include: { steps: true, actions: true },
            });
        }, { maxWait: 15000, timeout: 30000 });

        return updated;
    }

    // Handle APPROVE
    const isFinalStep = approvalReq.currentStep >= approvalReq.totalSteps;

    const updated = await prisma.$transaction(async (tx) => {
        await tx.approvalStep.update({
            where: { id: currentStep.id },
            data: {
                status: "APPROVED",
                reviewedBy: actorId,
                reviewedAt: new Date(),
                comments: comments ?? null,
            },
        });

        await tx.approvalAction.create({
            data: {
                requestId,
                actorId,
                action: "APPROVED",
                comments: comments ?? null,
            },
        });

        return tx.approvalRequest.update({
            where: { id: requestId },
            data: {
                status: isFinalStep ? "APPROVED" : "PENDING",
                currentStep: isFinalStep ? approvalReq.currentStep : approvalReq.currentStep + 1,
            },
            include: { steps: true, actions: true },
        });
    }, { maxWait: 15000, timeout: 30000 });

    return updated;
}
