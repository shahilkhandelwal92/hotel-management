/**
 * Task Engine Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies creation, status progression, audit trail, comments,
 * and escalation of hotel tasks.
 */

import { createHotelTask, updateHotelTaskStatus, addHotelTaskComment } from "@/lib/taskEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Task & Trace Engine", () => {
    let testHotelId: string;
    const staffId = "user-staff-1";

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found in test database");
        testHotelId = hotel.id;
    });

    test("creates an operational task with PENDING status and audit history", async () => {
        const task = await createHotelTask({
            hotelId: testHotelId,
            category: "GUEST_REQUEST",
            priority: "HIGH",
            title: "Deliver 2 extra feather pillows to Room 304",
            roomId: "room-304",
            guestId: "guest-123",
            createdBy: staffId,
        });

        expect(task.status).toBe("PENDING");
        expect(task.priority).toBe("HIGH");
        expect(task.statusHistory.length).toBe(1);
        expect(task.statusHistory[0].toStatus).toBe("PENDING");
    });

    test("updates task status with complete chronological audit trail", async () => {
        const task = await createHotelTask({
            hotelId: testHotelId,
            category: "MAINTENANCE",
            priority: "URGENT",
            title: "AC leaking water in Room 202",
            roomId: "room-202",
            createdBy: staffId,
        });

        const inProgress = await updateHotelTaskStatus({
            hotelId: testHotelId,
            taskId: task.id,
            toStatus: "IN_PROGRESS",
            changedBy: "tech-user-1",
            reason: "Technician dispatched to Room 202",
        });

        expect(inProgress.status).toBe("IN_PROGRESS");
        expect(inProgress.statusHistory.length).toBe(2);

        const completed = await updateHotelTaskStatus({
            hotelId: testHotelId,
            taskId: task.id,
            toStatus: "COMPLETED",
            changedBy: "tech-user-1",
            reason: "Drain pipe unblocked and condenser cleaned",
        });

        expect(completed.status).toBe("COMPLETED");
        expect(completed.completedAt).not.toBeNull();
        expect(completed.statusHistory.length).toBe(3);
    });

    test("adds collaborative comments to an active task", async () => {
        const task = await createHotelTask({
            hotelId: testHotelId,
            category: "VIP_ARRIVAL",
            priority: "HIGH",
            title: "Prepare complimentary welcome fruits & wine for Suite 501",
            createdBy: staffId,
        });

        const comment = await addHotelTaskComment({
            hotelId: testHotelId,
            taskId: task.id,
            userId: "duty-manager-1",
            comment: "Guest prefers red wine over white wine; confirmed with concierge.",
        });

        expect(comment.taskId).toBe(task.id);
        expect(comment.comment).toContain("red wine");
    });
});
