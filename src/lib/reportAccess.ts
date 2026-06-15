import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const REPORT_ROLES = ["SUPER_ADMIN", "OWNER", "ACCOUNTING"];

export async function getReportAccess(request: NextRequest, requestedHotelId?: string | null) {
    const session = await getSession();
    if (!session) return null;
    const access = getRequestAccess(request, session);
    if (!hasAccessRole(access, REPORT_ROLES)) return null;
    return {
        session,
        access,
        hotelId: resolveRequestedHotel(access, requestedHotelId),
    };
}
