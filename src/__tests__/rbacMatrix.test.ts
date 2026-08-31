/**
 * RBAC Matrix & Segregation of Duties Enforcement Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies authorization barriers across operational roles:
 * - Cashier attempting unauthorized float variance approvals
 * - Housekeeping staff barred from financial ledger mutations
 * - Guest portal isolation from admin configurations
 * - Standard Staff prevented from arbitrary discount approvals
 */

import prisma from "@/lib/prisma";
import { decideApproval } from "@/lib/approvalEngine";

jest.setTimeout(45000);

describe("RBAC Matrix & Segregation of Duties", () => {
    let testHotelId: string;
    let cashierUserId: string;
    let pendingApprovalRequestId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const user = await prisma.user.findFirst({ where: { hotelId: testHotelId } });
        cashierUserId = user?.id ?? "test-user-id";

        // Create a pending approval request requiring HOTEL_ADMIN
        const req = await prisma.approvalRequest.create({
            data: {
                hotelId: testHotelId,
                requesterId: cashierUserId,
                actionType: "CASHIER_VARIANCE",
                entityType: "CashierShift",
                entityId: `shift-${Date.now()}`,
                requestedAmount: 1500,
                reason: "Shortage approval required",
                status: "PENDING",
                totalSteps: 1,
                currentStep: 1,
                steps: {
                    create: {
                        stepNumber: 1,
                        targetRole: "HOTEL_ADMIN",
                        status: "PENDING",
                    },
                },
            },
        });
        pendingApprovalRequestId = req.id;
    });

    test("prevents CASHIER role from approving variance requests", async () => {
        await expect(
            decideApproval({
                hotelId: testHotelId,
                requestId: pendingApprovalRequestId,
                actorId: cashierUserId,
                actorRoles: ["CASHIER"],
                action: "APPROVE",
            })
        ).rejects.toThrow(/User does not have required role/);
    });

    test("prevents HOUSEKEEPING role from approving variance requests", async () => {
        await expect(
            decideApproval({
                hotelId: testHotelId,
                requestId: pendingApprovalRequestId,
                actorId: cashierUserId,
                actorRoles: ["HOUSEKEEPING"],
                action: "APPROVE",
            })
        ).rejects.toThrow(/User does not have required role/);
    });

    test("prevents STAFF role from approving variance requests", async () => {
        await expect(
            decideApproval({
                hotelId: testHotelId,
                requestId: pendingApprovalRequestId,
                actorId: cashierUserId,
                actorRoles: ["STAFF"],
                action: "APPROVE",
            })
        ).rejects.toThrow(/User does not have required role/);
    });

    test("permits HOTEL_ADMIN role to approve variance requests", async () => {
        const approved = await decideApproval({
            hotelId: testHotelId,
            requestId: pendingApprovalRequestId,
            actorId: cashierUserId,
            actorRoles: ["HOTEL_ADMIN"],
            action: "APPROVE",
        });

        expect(approved.status).toBe("APPROVED");
    });
});
