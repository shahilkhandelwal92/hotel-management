import { assertTenant, isSuperAdmin, resolveHotelId, assertPlanLimit, TenantViolation } from "../lib/tenantGuard";

describe("Tenant Guard & Multi-Tenant Isolation", () => {
    const superAdminSession = {
        user: {
            id: "user-super-1",
            roles: [{ role: { name: "SUPER_ADMIN" } }],
            permissions: ["ALL"],
        },
    };

    const ownerSession = {
        user: {
            id: "user-owner-1",
            roles: [{ role: { name: "OWNER" } }],
            permissions: ["ALL"],
        },
    };

    const hotelAStaffSession = {
        user: {
            id: "staff-hotel-a",
            hotelId: "hotel-property-a",
            roles: [{ role: { name: "STAFF" } }],
            permissions: ["MANAGE_BOOKINGS"],
        },
    };

    const hotelBStaffSession = {
        user: {
            id: "staff-hotel-b",
            hotelId: "hotel-property-b",
            roles: [{ role: { name: "FRONT_DESK" } }],
            permissions: ["MANAGE_BOOKINGS"],
        },
    };

    describe("Super Admin & Owner Detection", () => {
        it("identifies SUPER_ADMIN as super admin", () => {
            expect(isSuperAdmin(superAdminSession)).toBe(true);
        });

        it("identifies OWNER as super admin", () => {
            expect(isSuperAdmin(ownerSession)).toBe(true);
        });

        it("does not treat regular hotel staff as super admin", () => {
            expect(isSuperAdmin(hotelAStaffSession)).toBe(false);
            expect(isSuperAdmin(hotelBStaffSession)).toBe(false);
        });
    });

    describe("assertTenant boundary enforcement", () => {
        it("allows hotel staff to access their own hotel property", () => {
            expect(() => assertTenant(hotelAStaffSession, "hotel-property-a")).not.toThrow();
        });

        it("throws TenantViolation when Hotel A staff attempts to access Hotel B data", () => {
            expect(() => assertTenant(hotelAStaffSession, "hotel-property-b")).toThrow(TenantViolation);
        });

        it("allows Super Admin to access any hotel property", () => {
            expect(() => assertTenant(superAdminSession, "hotel-property-b")).not.toThrow();
            expect(() => assertTenant(superAdminSession, "hotel-property-a")).not.toThrow();
        });

        it("throws TenantViolation for unauthenticated sessions", () => {
            expect(() => assertTenant(null, "hotel-property-a")).toThrow(TenantViolation);
        });
    });

    describe("resolveHotelId scoping", () => {
        it("returns the requested hotelId when called by Super Admin", () => {
            const resolved = resolveHotelId(superAdminSession, "hotel-property-custom");
            expect(resolved).toBe("hotel-property-custom");
        });

        it("returns the session's locked hotelId when called by regular hotel staff regardless of query parameter", () => {
            const resolved = resolveHotelId(hotelAStaffSession, "hotel-property-b");
            expect(resolved).toBe("hotel-property-a");
        });

        it("returns null for unauthenticated sessions", () => {
            expect(resolveHotelId(null, "hotel-property-a")).toBeNull();
        });
    });

    describe("assertPlanLimit SaaS quota enforcement", () => {
        it("allows creation when under the limit", () => {
            expect(() => assertPlanLimit("rooms", 49, 50)).not.toThrow();
        });

        it("throws TenantViolation when at or exceeding the limit", () => {
            expect(() => assertPlanLimit("rooms", 50, 50)).toThrow(TenantViolation);
            expect(() => assertPlanLimit("users", 12, 10)).toThrow(TenantViolation);
        });
    });
});
