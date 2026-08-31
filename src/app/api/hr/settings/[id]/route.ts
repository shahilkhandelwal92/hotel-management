import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    const auth = await requirePermission(req, PERMISSIONS.HR_SETTINGS_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    try {
        const { id } = await params;

        // Verify leave type belongs to user's property (IDOR prevention)
        const existing = await prisma.leaveType.findFirst({
            where: {
                id,
                ...(tenant.isSuperAdmin ? {} : { hotelId: tenant.hotelId }),
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Leave type not found for this property" }, { status: 404 });
        }

        // Check if there are leave requests using this type
        const count = await prisma.leaveRequest.count({ where: { leaveTypeId: id } });
        if (count > 0) {
            return NextResponse.json({ error: "Cannot delete leave type that is in use by staff" }, { status: 400 });
        }

        await prisma.leaveType.delete({ where: { id } });

        await logAudit({
            hotelId: existing.hotelId,
            userId: tenant.userId,
            module: "Payroll",
            action: "DELETE",
            entityId: id,
            oldValue: { name: existing.name, maxDays: existing.maxDays },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/hr/settings/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete leave type" }, { status: 500 });
    }
}
