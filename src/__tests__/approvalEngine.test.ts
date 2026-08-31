/**
 * Approval Engine Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies approval requests, threshold checks, auto-approvals,
 * role authorization, rejection, and cancellation lifecycles.
 */

import { requestApproval, decideApproval } from "@/lib/approvalEngine";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe("Enterprise Approval Engine", () => {
    let testHotelId: string;
    const requesterId = "user-front-desk-1";
    const managerId = "user-manager-1";

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found in test database");
        testHotelId = hotel.id;
    });

    test("creates a multi-step approval request when above threshold", async () => {
        await prisma.approvalPolicy.create({
            data: {
                hotelId: testHotelId,
                actionType: "DISCOUNT",
                minAmount: new Prisma.Decimal("1000.00"),
                requiredRole: "MANAGER",
                approvalLevels: 2,
                autoApproveBelow: new Prisma.Decimal("500.00"),
            },
        });

        const result = await requestApproval({
            hotelId: testHotelId,
            requesterId,
            actionType: "DISCOUNT",
            entityType: "Folio",
            entityId: "folio-123",
            requestedAmount: 2500,
            reason: "VIP guest goodwill discount",
        });

        expect(result.autoApproved).toBe(false);
        expect(result.request.status).toBe("PENDING");
        expect(result.request.totalSteps).toBe(2);
        expect(result.request.currentStep).toBe(1);
        expect(result.request.steps.length).toBe(2);
    });

    test("auto-approves when requested amount is below auto-approve threshold", async () => {
        const result = await requestApproval({
            hotelId: testHotelId,
            requesterId,
            actionType: "DISCOUNT",
            entityType: "Folio",
            entityId: "folio-456",
            requestedAmount: 300,
            reason: "Minor billing courtesy",
        });

        expect(result.autoApproved).toBe(true);
        expect(result.request.status).toBe("APPROVED");
    });

    test("rejects approval attempt when actor lacks required role", async () => {
        const { request } = await requestApproval({
            hotelId: testHotelId,
            requesterId,
            actionType: "REFUND",
            entityType: "Payment",
            entityId: "pay-789",
            requestedAmount: 5000,
            reason: "Guest requested cancellation refund",
        });

        await expect(
            decideApproval({
                hotelId: testHotelId,
                requestId: request.id,
                actorId: "unauthorized-staff-id",
                actorRoles: ["STAFF"],
                action: "APPROVE",
            })
        ).rejects.toThrow(/does not have required role/);
    });

    test("successfully advances and finalizes approval steps", async () => {
        const { request } = await requestApproval({
            hotelId: testHotelId,
            requesterId,
            actionType: "PO_APPROVE",
            entityType: "PurchaseOrder",
            entityId: "po-101",
            requestedAmount: 15000,
            reason: "Emergency HVAC chiller replacement part",
        });

        const approved = await decideApproval({
            hotelId: testHotelId,
            requestId: request.id,
            actorId: managerId,
            actorRoles: ["HOTEL_ADMIN"],
            action: "APPROVE",
            comments: "Reviewed and approved for procurement",
        });

        expect(approved.status).toBe("APPROVED");
        expect(approved.steps[0].status).toBe("APPROVED");
        expect(approved.actions.some((a) => a.action === "APPROVED")).toBe(true);
    });
});
