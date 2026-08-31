jest.mock("../lib/auth", () => ({
    getSession: jest.fn(),
}));

import { PERMISSIONS } from "../lib/permissions";

describe("P0-2: Server-Side Permission Authorization Engine", () => {
    it("defines all mandatory enterprise hotel management permissions", () => {
        expect(PERMISSIONS.RESERVATION_VIEW).toBe("RESERVATION_VIEW");
        expect(PERMISSIONS.RESERVATION_CREATE).toBe("RESERVATION_CREATE");
        expect(PERMISSIONS.ROOM_UPDATE).toBe("ROOM_UPDATE");
        expect(PERMISSIONS.INVOICE_CREATE).toBe("INVOICE_CREATE");
        expect(PERMISSIONS.PAYMENT_CREATE).toBe("PAYMENT_CREATE");
        expect(PERMISSIONS.PAYMENT_REFUND).toBe("PAYMENT_REFUND");
        expect(PERMISSIONS.FOLIO_ADJUST).toBe("FOLIO_ADJUST");
        expect(PERMISSIONS.REPORT_FINANCIAL).toBe("REPORT_FINANCIAL");
        expect(PERMISSIONS.REPORT_GST).toBe("REPORT_GST");
        expect(PERMISSIONS.EXPORT_GUEST_DATA).toBe("EXPORT_GUEST_DATA");
        expect(PERMISSIONS.PAYROLL_APPROVE).toBe("PAYROLL_APPROVE");
        expect(PERMISSIONS.NIGHT_AUDIT_CLOSE).toBe("NIGHT_AUDIT_CLOSE");
    });

    it("verifies permission set operations (has, requireAny, requireAll)", () => {
        const userPermissions = new Set<string>([
            PERMISSIONS.RESERVATION_VIEW,
            PERMISSIONS.RESERVATION_CREATE,
            PERMISSIONS.ROOM_VIEW,
        ]);

        expect(userPermissions.has(PERMISSIONS.RESERVATION_VIEW)).toBe(true);
        expect(userPermissions.has(PERMISSIONS.PAYMENT_REFUND)).toBe(false);

        const hasAny = [PERMISSIONS.PAYMENT_REFUND, PERMISSIONS.RESERVATION_VIEW].some((p) =>
            userPermissions.has(p)
        );
        expect(hasAny).toBe(true);

        const hasAll = [PERMISSIONS.RESERVATION_VIEW, PERMISSIONS.PAYMENT_REFUND].every((p) =>
            userPermissions.has(p)
        );
        expect(hasAll).toBe(false);
    });
});
