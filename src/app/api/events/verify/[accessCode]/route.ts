import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createPortalToken } from "@/lib/portalAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ accessCode: string }> }
) {
    const { accessCode } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    // 1. Rate Limiting / Brute-Force Protection (max 5 attempts per 15 mins per IP)
    const rateLimit = await checkRateLimit(`event_code_verify:${ip}`, { maxAttempts: 5, windowSeconds: 900 });
    if (!rateLimit.allowed) {
        return NextResponse.json({
            error: `Too many failed access code attempts. Please wait ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes before retrying.`,
        }, { status: 429 });
    }

    if (!accessCode || typeof accessCode !== "string" || accessCode.trim().length < 4) {
        return NextResponse.json({ error: "Invalid Access Code format" }, { status: 400 });
    }

    const code = accessCode.trim().toUpperCase();

    try {
        const event = await prisma.corporateEvent.findUnique({
            where: { accessCode: code },
            select: { id: true, hotelId: true, name: true, status: true, endDate: true },
        });

        if (!event) {
            return NextResponse.json({ error: "Invalid Access Code. Please check and try again." }, { status: 404 });
        }

        // 2. Check Event Status and Date Expiration
        if (event.status === "Cancelled") {
            return NextResponse.json({ error: "This corporate event has been cancelled." }, { status: 403 });
        }

        const now = new Date();
        const expirationGracePeriod = new Date(event.endDate.getTime() + 24 * 60 * 60 * 1000); // 24h grace
        if (now > expirationGracePeriod) {
            return NextResponse.json({ error: "This corporate event has concluded and access is expired." }, { status: 403 });
        }

        // 3. Issue Corporate Session Token
        const token = await createPortalToken({ type: "corporate", subjectId: event.id });
        const cookieStore = await cookies();
        cookieStore.set("corporate_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 12,
            path: "/",
        });

        await logAudit({
            hotelId: event.hotelId,
            module: "Corporate",
            action: "VERIFY_ACCESS_CODE",
            entityId: event.id,
            details: `Successful corporate access verification for event: ${event.name}`,
            req: request,
        });

        return NextResponse.json({ eventId: event.id });
    } catch (err) {
        console.error("Verify Access Code Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
