import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, resolveRequestedHotel } from "@/lib/apiAccess";
import type { Prisma } from "@prisma/client";

// GET – subscription + plan details for a hotel
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);

    const { searchParams } = new URL(req.url);
    const requestedHotelId = searchParams.get("hotelId");

    // List all plans (for plan selection UI)
    if (searchParams.get("plans") === "true") {
        const plans = await prisma.saasPlan.findMany({
            where: { isActive: true },
            include: {
                features: { include: { feature: true } },
            },
            orderBy: { priceMonthly: "asc" },
        });
        return NextResponse.json({ plans });
    }

    const hotelId = resolveRequestedHotel(access, requestedHotelId);
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const subscription = await prisma.saasSubscription.findUnique({
        where: { hotelId },
        include: {
            plan: { include: { features: { include: { feature: true } } } },
            saasInvoices: { orderBy: { createdAt: "desc" }, take: 12 },
        },
    });

    // Usage metrics
    const [rooms, users, reservations] = await Promise.all([
        prisma.room.count({ where: { hotelId } }),
        prisma.user.count({ where: { hotelId } }),
        prisma.reservation.count({ where: { hotelId, deletedAt: null } }),
    ]);

    return NextResponse.json({
        subscription,
        usage: { rooms, users, reservations },
    });
}

// POST – create subscription for a hotel
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!access.isSuperAdmin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });

    const { hotelId, planId, billingCycle = "Monthly", trialDays = 14 } = await req.json();

    const plan = await prisma.saasPlan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    const periodEnd = new Date(trialEndsAt);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "Annual" ? 12 : 1));

    const sub = await prisma.saasSubscription.create({
        data: {
            hotelId, planId, billingCycle,
            status: "Trial",
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
    });

    // Seed initial features
    await prisma.usageTracking.createMany({
        data: [
            { hotelId, metric: "rooms", value: 0, period: now.toISOString().slice(0, 7) },
            { hotelId, metric: "users", value: 0, period: now.toISOString().slice(0, 7) },
        ],
    });

    return NextResponse.json({ subscription: sub }, { status: 201 });
}

// PUT – upgrade/downgrade plan, cancel, reactivate
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!access.isSuperAdmin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });

    const { hotelId, action, planId } = await req.json();

    const sub = await prisma.saasSubscription.findUnique({ where: { hotelId } });
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    let update: Prisma.SaasSubscriptionUpdateInput = {};

    if (action === "upgrade" && planId) {
        const plan = await prisma.saasPlan.findUnique({ where: { id: planId } });
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        update = { plan: { connect: { id: planId } }, status: "Active" };
    } else if (action === "cancel") {
        update = { cancelAtPeriodEnd: true };
    } else if (action === "reactivate") {
        update = { cancelAtPeriodEnd: false, status: "Active" };
    } else if (action === "suspend") {
        update = { status: "Suspended" };
    }

    const updated = await prisma.saasSubscription.update({
        where: { id: sub.id },
        data: update,
        include: { plan: true },
    });

    return NextResponse.json({ subscription: updated });
}
