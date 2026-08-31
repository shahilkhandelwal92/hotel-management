import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.GUEST_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const body = await req.json();
    const { category, message, rating, page } = body;

    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

    await prisma.auditLog.create({
        data: {
            hotelId,
            userId: auth.userId,
            module: "Feedback",
            action: "CREATE",
            details: JSON.stringify({ category: category ?? "General", rating: rating ?? null, page: page ?? null, message }),
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
            userAgent: req.headers.get("user-agent") ?? null,
        },
    });

    return NextResponse.json({ success: true, message: "Feedback submitted. Thank you!" });
}

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.REPORT_FINANCIAL);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;

    const hotelId = tenant.hotelId;
    const entries = await prisma.auditLog.findMany({
        where: { module: "Feedback", ...(hotelId ? { hotelId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, hotelId: true, userId: true, details: true, createdAt: true, ipAddress: true },
    });

    const feedback = entries.map((e) => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(e.details ?? "{}"); } catch { }
        return { id: e.id, hotelId: e.hotelId, userId: e.userId, createdAt: e.createdAt, ...parsed };
    });

    return NextResponse.json({ feedback, total: feedback.length });
}
