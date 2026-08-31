import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "../lib/apiAccess";
import type { NextRequest } from "next/server";
import type { Session } from "../lib/auth";

describe("API Access & Role Resolution", () => {
    function createMockRequest(headers: Record<string, string> = {}): NextRequest {
        return {
            headers: new Headers(headers),
        } as unknown as NextRequest;
    }

    const mockAdminSession: Session = {
        id: "usr-admin",
        hotelId: "hotel-101",
        roles: ["HOTEL_ADMIN"],
        permissions: ["MANAGE_BOOKINGS", "MANAGE_INVENTORY"],
        user: {
            id: "usr-admin",
            hotelId: "hotel-101",
            roles: [{ role: { name: "HOTEL_ADMIN" } }],
            permissions: ["MANAGE_BOOKINGS", "MANAGE_INVENTORY"],
        },
    };

    const mockSuperAdminSession: Session = {
        id: "usr-super",
        hotelId: null,
        roles: ["SUPER_ADMIN"],
        permissions: ["ALL"],
        user: {
            id: "usr-super",
            hotelId: null,
            roles: [{ role: { name: "SUPER_ADMIN" } }],
            permissions: ["ALL"],
        },
    };

    describe("getRequestAccess", () => {
        it("correctly extracts roles and active hotel from request header", () => {
            const req = createMockRequest({ "x-hotel-id": "hotel-override-1" });
            const access = getRequestAccess(req, mockAdminSession);

            expect(access.roles).toEqual(["HOTEL_ADMIN"]);
            expect(access.isSuperAdmin).toBe(false);
            expect(access.activeHotelId).toBe("hotel-override-1");
        });

        it("falls back to session hotelId if header is absent", () => {
            const req = createMockRequest({});
            const access = getRequestAccess(req, mockAdminSession);

            expect(access.activeHotelId).toBe("hotel-101");
        });

        it("recognizes super admin privileges", () => {
            const req = createMockRequest({});
            const access = getRequestAccess(req, mockSuperAdminSession);

            expect(access.isSuperAdmin).toBe(true);
        });
    });

    describe("hasAccessRole", () => {
        it("returns true when user has one of the allowed roles", () => {
            const access = { roles: ["ACCOUNTING"], isSuperAdmin: false, activeHotelId: "hotel-101" };
            expect(hasAccessRole(access, ["ACCOUNTING", "SUPER_ADMIN"])).toBe(true);
        });

        it("returns false when user does not have any allowed role", () => {
            const access = { roles: ["HOUSEKEEPING"], isSuperAdmin: false, activeHotelId: "hotel-101" };
            expect(hasAccessRole(access, ["ACCOUNTING", "HOTEL_ADMIN"])).toBe(false);
        });
    });

    describe("resolveRequestedHotel", () => {
        it("allows super admin to query any requested hotel", () => {
            const access = { roles: ["SUPER_ADMIN"], isSuperAdmin: true, activeHotelId: null };
            expect(resolveRequestedHotel(access, "hotel-999")).toBe("hotel-999");
        });

        it("allows hotel admin to access their own hotel", () => {
            const access = { roles: ["HOTEL_ADMIN"], isSuperAdmin: false, activeHotelId: "hotel-101" };
            expect(resolveRequestedHotel(access, "hotel-101")).toBe("hotel-101");
        });

        it("denies hotel admin from accessing a different hotel", () => {
            const access = { roles: ["HOTEL_ADMIN"], isSuperAdmin: false, activeHotelId: "hotel-101" };
            expect(resolveRequestedHotel(access, "hotel-999")).toBeNull();
        });
    });
});
