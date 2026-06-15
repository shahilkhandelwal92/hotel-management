import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLockProvider } from "@/lib/locks/getLockProvider";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

/**
 * POST /api/locks/webhook
 *
 * Receives door lock events from hardware vendors (ASSA ABLOY, Dormakaba, etc.)
 * or from internal QR scanner systems.
 *
 * Security:
 *   - Validates HMAC-SHA256 signature from X-Webhook-Signature header
 *   - Returns 401 for invalid signatures (vendor misconfiguration)
 *   - Provider is determined from X-Lock-Provider header
 *
 * Payload (vendor-normalized):
 *   externalRef  string   — credential identifier
 *   action       string   — ENTRY / EXIT / DENIED
 *   deviceId?    string   — door sensor ID
 *   roomId?      string   — room identifier
 *   hotelId      string   — hotel identifier
 *   timestamp?   string   — event time (defaults to now)
 */
export async function POST(req: NextRequest) {
    const providerName = req.headers.get("x-lock-provider") ?? "INTERNAL_QR";
    const signature = req.headers.get("x-webhook-signature") ?? "";

    // Read raw body for signature validation
    const rawBody = await req.text();

    let validSignature = false;
    if (["INTERNAL_QR", "MOCK"].includes(providerName.toUpperCase())) {
        const webhookSecret = process.env.LOCK_WEBHOOK_SECRET;
        if (!webhookSecret || webhookSecret.length < 32) {
            return NextResponse.json({ error: "Lock webhook is not securely configured" }, { status: 503 });
        }
        const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
        const suppliedBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expected, "hex");
        validSignature =
            suppliedBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
    } else {
        const provider = getLockProvider(providerName);
        validSignature = provider.verifyWebhookSignature(rawBody, signature);
    }

    if (!validSignature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { externalRef, action, deviceId, roomId, hotelId, timestamp } = body as Record<string, string>;

    if (!externalRef || !action || !hotelId) {
        return NextResponse.json({ error: "externalRef, action, hotelId are required" }, { status: 400 });
    }

    const validActions = ["ENTRY", "EXIT", "DENIED"];
    if (!validActions.includes(action)) {
        return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    // Find matching credential
    const credential = await prisma.accessCredential.findFirst({
        where: { externalRef, hotelId },
        select: { id: true, userType: true, status: true },
    });

    if (!credential) {
        // Unknown credential — log as DENIED and alert
        await logAudit({
            hotelId,
            module: "AccessLog",
            action: "DENIED_UNKNOWN_CREDENTIAL",
            details: JSON.stringify({ externalRef, deviceId, source: "Webhook" }),
        });
        return NextResponse.json({ warning: "Credential not found — logged as security alert" }, { status: 200 });
    }

    // Store the access event
    await prisma.accessLog.create({
        data: {
            hotelId,
            roomId: roomId ?? null,
            credentialId: credential.id,
            userType: credential.userType,
            action,
            source: "Webhook",
            deviceId: deviceId ?? null,
            rawPayload: body as object,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
    });

    // Alert on denied entry
    if (action === "DENIED") {
        await logAudit({
            hotelId,
            module: "AccessLog",
            action: "DENIED_ENTRY",
            entityId: credential.id,
            details: JSON.stringify({ externalRef, deviceId, roomId, source: "Webhook" }),
        });
    }

    return NextResponse.json({ success: true, action, credentialId: credential.id });
}
