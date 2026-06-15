import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Feedback Collection API
 * POST /api/feedback  { hotelId, category, message, rating? }
 * GET  /api/feedback?hotelId=  (admin/SA view)
 */

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hotelId = req.headers.get("x-hotel-id");
    const body = await req.json();
    const { category, message, rating, page } = body;

    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

    // Save as AuditLog entry under module "Feedback" (no extra table needed)
    await prisma.auditLog.create({
        data: {
            hotelId,
            userId: session.user.id as string,
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
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const injectedRole = req.headers.get("x-user-role");
    const isSA = injectedRole === "SUPER_ADMIN" || injectedRole === "OWNER";
    if (!isSA) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");

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
