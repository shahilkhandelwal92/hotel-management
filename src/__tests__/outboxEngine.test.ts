/**
 * Outbox Engine Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies transactional outbox enqueuing, HMAC signature verification,
 * and reliable batch processing.
 */

import {
    enqueueOutboxEvent,
    processOutboxBatch,
    generateWebhookSignature,
    verifyWebhookSignature,
} from "@/lib/outboxEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Outbox & Integration Engine", () => {
    let testHotelId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found in test database");
        testHotelId = hotel.id;
    });

    test("generates and verifies valid HMAC SHA256 webhook signatures", () => {
        const payload = JSON.stringify({ event: "RESERVATION_CREATED", bookingRef: "RES-9988" });
        const secret = "whsec_super_secret_enterprise_key_12345";

        const signature = generateWebhookSignature(payload, secret);
        expect(typeof signature).toBe("string");
        expect(signature.length).toBe(64); // 256-bit hex

        const isValid = verifyWebhookSignature(payload, secret, signature);
        expect(isValid).toBe(true);

        const isTampered = verifyWebhookSignature(payload + "tampered", secret, signature);
        expect(isTampered).toBe(false);
    });

    test("enqueues an event and successfully dispatches to subscribed webhooks", async () => {
        const uniqueSuffix = Date.now().toString();
        // Register an active webhook endpoint
        const endpoint = await prisma.webhookEndpoint.create({
            data: {
                hotelId: testHotelId,
                url: `https://api.thirdparty-crm.com/webhooks/stayos-${uniqueSuffix}`,
                secret: "secret-key-crm-99",
                events: ["RESERVATION_CREATED", "CHECKIN_COMPLETED"],
                isActive: true,
            },
        });

        // Enqueue outbox event
        const event = await enqueueOutboxEvent({
            hotelId: testHotelId,
            eventType: "RESERVATION_CREATED",
            aggregateType: "Reservation",
            aggregateId: `res-uuid-${uniqueSuffix}`,
            payload: {
                bookingRef: `RES-${uniqueSuffix}`,
                guestName: "Alice Smith",
                totalAmount: "12500.00",
            },
        });

        expect(event.status).toBe("PENDING");

        // Process batch
        const results = await processOutboxBatch(10);
        expect(results.some((r) => r.id === event.id)).toBe(true);

        // Verify webhook delivery attempt was recorded
        const deliveries = await prisma.webhookDeliveryAttempt.findMany({
            where: { endpointId: endpoint.id },
        });

        expect(deliveries.length).toBe(1);
        expect(deliveries[0].success).toBe(true);
        expect(deliveries[0].statusCode).toBe(200);
    });
});
