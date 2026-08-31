/**
 * Enterprise Guest Communications & Template Engine
 * ──────────────────────────────────────────────────────────────────────
 * Manages multi-channel communication templates (Email, SMS, WhatsApp)
 * with variable substitution and outbound message logging.
 */

import prisma from "@/lib/prisma";

export function renderTemplate(templateBody: string, variables: Record<string, string>): string {
    let rendered = templateBody;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        rendered = rendered.replace(regex, value);
    }
    return rendered;
}

export async function upsertMessageTemplate(params: {
    hotelId: string;
    name: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP" | string;
    subject?: string;
    body: string;
}) {
    const { hotelId, name, channel, subject, body } = params;

    return prisma.messageTemplate.upsert({
        where: {
            hotelId_name_channel: { hotelId, name, channel },
        },
        update: {
            subject: subject ?? null,
            body,
            isActive: true,
        },
        create: {
            hotelId,
            name,
            channel,
            subject: subject ?? null,
            body,
            isActive: true,
        },
    });
}

export async function sendGuestMessage(params: {
    hotelId: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP" | string;
    recipient: string;
    subject?: string;
    messageBody: string;
    guestId?: string;
    reservationId?: string;
}) {
    const { hotelId, channel, recipient, subject, messageBody, guestId, reservationId } = params;

    return prisma.guestMessageLog.create({
        data: {
            hotelId,
            channel,
            recipient,
            subject: subject ?? null,
            messageBody,
            guestId: guestId ?? null,
            reservationId: reservationId ?? null,
            status: "SENT",
            providerRef: `MSG-${Date.now().toString().slice(-8)}`,
        },
    });
}
