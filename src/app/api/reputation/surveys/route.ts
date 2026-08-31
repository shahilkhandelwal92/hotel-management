import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    submitFeedbackSurvey,
    resolveServiceRecoveryTicket,
} from "@/lib/reputationEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.GUEST_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const surveys = await prisma.guestFeedbackSurvey.findMany({
        where: { hotelId: tenant.hotelId },
        include: { recoveryTicket: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ surveys });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.GUEST_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "RESOLVE_RECOVERY") {
            const ticket = await resolveServiceRecoveryTicket({
                ticketId: body.ticketId,
                compensationOffered: body.compensationOffered,
                resolutionNotes: body.resolutionNotes,
            });
            return NextResponse.json({ ticket });
        }

        const result = await submitFeedbackSurvey({
            hotelId: tenant.hotelId,
            guestName: body.guestName,
            guestEmail: body.guestEmail,
            reservationId: body.reservationId,
            rating: body.rating,
            npsScore: body.npsScore,
            cleanlinessRating: body.cleanlinessRating,
            staffRating: body.staffRating,
            foodRating: body.foodRating,
            comments: body.comments,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to submit survey" },
            { status: 500 }
        );
    }
}
