/**
 * Guest Communications & Template Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies template variable interpolation and multi-channel message logging.
 */

import {
    renderTemplate,
    upsertMessageTemplate,
    sendGuestMessage,
} from "@/lib/communicationEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Communications & Template Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;
    });

    test("interpolates dynamic template variables into message body", () => {
        const template = "Dear {{guestName}}, your booking {{bookingRef}} at {{hotelName}} is confirmed for {{arrivalDate}}.";
        const variables = {
            guestName: "Lord Mountbatten",
            bookingRef: "RES-998811",
            hotelName: "The Royal Palace Jaipur",
            arrivalDate: "01 Sep 2026",
        };

        const rendered = renderTemplate(template, variables);
        expect(rendered).toBe("Dear Lord Mountbatten, your booking RES-998811 at The Royal Palace Jaipur is confirmed for 01 Sep 2026.");
    });

    test("saves template and records outbound WhatsApp communication log", async () => {
        const template = await upsertMessageTemplate({
            hotelId: testHotelId,
            name: "Check-in Reminder",
            channel: "WHATSAPP",
            body: "Hi {{guestName}}, online check-in is now open for your stay tomorrow.",
        });

        expect(template.channel).toBe("WHATSAPP");

        const msgLog = await sendGuestMessage({
            hotelId: testHotelId,
            channel: "WHATSAPP",
            recipient: "+919876543210",
            messageBody: "Hi Lord Mountbatten, online check-in is now open for your stay tomorrow.",
        });

        expect(msgLog.status).toBe("SENT");
        expect(msgLog.recipient).toBe("+919876543210");
        expect(msgLog.providerRef).not.toBeNull();
    });
});
