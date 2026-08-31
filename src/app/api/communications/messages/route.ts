import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    upsertMessageTemplate,
    renderTemplate,
    sendGuestMessage,
} from "@/lib/communicationEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.COMMUNICATION_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "templates") {
        const templates = await prisma.messageTemplate.findMany({
            where: { hotelId: tenant.hotelId },
            orderBy: { name: "asc" },
        });
        return NextResponse.json({ templates });
    }

    const logs = await prisma.guestMessageLog.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ messageLogs: logs });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.COMMUNICATION_SEND);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "SAVE_TEMPLATE") {
            const template = await upsertMessageTemplate({
                hotelId: tenant.hotelId,
                name: body.name,
                channel: body.channel,
                subject: body.subject,
                body: body.body,
            });
            return NextResponse.json({ template });
        }

        let messageBody = body.messageBody;
        if (body.templateId && body.variables) {
            const template = await prisma.messageTemplate.findUnique({
                where: { id: body.templateId },
            });
            if (template) {
                messageBody = renderTemplate(template.body, body.variables);
            }
        }

        const msgLog = await sendGuestMessage({
            hotelId: tenant.hotelId,
            channel: body.channel ?? "EMAIL",
            recipient: body.recipient,
            subject: body.subject,
            messageBody,
            guestId: body.guestId,
            reservationId: body.reservationId,
        });

        return NextResponse.json({ messageLog: msgLog }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to process communication action" },
            { status: 500 }
        );
    }
}
