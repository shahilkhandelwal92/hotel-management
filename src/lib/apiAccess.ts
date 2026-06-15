import type { NextRequest } from "next/server";
import type { Session } from "@/lib/auth";

const SUPER_ROLES = ["SUPER_ADMIN", "OWNER"];

export type RequestAccess = {
    roles: string[];
    isSuperAdmin: boolean;
    activeHotelId: string | null;
};

export function getRequestAccess(req: NextRequest, session: Session): RequestAccess {
    const roles = session.roles;
    return {
        roles,
        isSuperAdmin: roles.some((role) => SUPER_ROLES.includes(role)),
        activeHotelId: req.headers.get("x-hotel-id") ?? session.hotelId,
    };
}

export function hasAccessRole(access: RequestAccess, allowedRoles: string[]): boolean {
    return access.roles.some((role) => allowedRoles.includes(role));
}

export function resolveRequestedHotel(
    access: RequestAccess,
    requestedHotelId?: string | null,
): string | null {
    if (access.isSuperAdmin) {
        return requestedHotelId ?? access.activeHotelId;
    }
    if (!access.activeHotelId) return null;
    if (requestedHotelId && requestedHotelId !== access.activeHotelId) return null;
    return access.activeHotelId;
}
