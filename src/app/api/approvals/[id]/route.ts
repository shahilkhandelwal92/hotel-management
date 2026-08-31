import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { decideApproval } from "@/lib/approvalEngine";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requirePermission(req, PERMISSIONS.APPROVAL_DECIDE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { id } = await context.params;

    try {
        const body = await req.json();
        const { action, comments } = body;

        if (!action || !["APPROVE", "REJECT", "CANCEL"].includes(action)) {
            return NextResponse.json({ error: "Invalid approval action" }, { status: 400 });
        }

        const result = await decideApproval({
            hotelId: tenant.hotelId,
            requestId: id,
            actorId: auth.userId,
            actorRoles: auth.roles,
            action,
            comments,
        });

        return NextResponse.json({ success: true, request: result });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to decide approval request" },
            { status: 400 }
        );
    }
}
