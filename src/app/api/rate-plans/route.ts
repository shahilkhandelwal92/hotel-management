import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAccess, hasAccessRole, resolveRequestedHotel } from "@/lib/apiAccess";

const RATE_PLAN_READ_ROLES = [
    "SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "STAFF",
];
const RATE_PLAN_WRITE_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER"];
type RatePlanRuleInput = { ruleType: string; multiplier?: string | number; value?: string | null };
type SeasonalRateInput = {
    name: string;
    startDate: string;
    endDate: string;
    multiplier?: string | number;
};

// GET – rate plans for a hotel (with rules and seasonal rates)
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, RATE_PLAN_READ_ROLES)) {
        return NextResponse.json({ error: "Reservation access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hotelId = resolveRequestedHotel(access, searchParams.get("hotelId"));
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });

    const plans = await prisma.ratePlan.findMany({
        where: { hotelId },
        include: { rules: true, seasonalRates: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plans });
}

// POST – create new rate plan (with optional rules and seasonal rates)
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, RATE_PLAN_WRITE_ROLES)) {
        return NextResponse.json({ error: "Hotel Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { hotelId: requestedHotelId, name, code, description, baseMultiplier, cancellationHours,
        refundPolicy, mealPlan, rules = [], seasonalRates = [] } = body;
    const hotelId = resolveRequestedHotel(access, requestedHotelId);
    if (!hotelId) return NextResponse.json({ error: "Invalid hotel context" }, { status: 403 });
    if (typeof name !== "string" || !name.trim() || typeof code !== "string" || !code.trim()) {
        return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const plan = await prisma.ratePlan.create({
        data: {
            hotelId, name, code: code.toUpperCase(), description,
            baseMultiplier: parseFloat(baseMultiplier ?? 1),
            cancellationHours: parseInt(cancellationHours ?? 24),
            refundPolicy: refundPolicy ?? "FullRefund48h",
            mealPlan: mealPlan ?? "RO",
            rules: {
                create: (rules as RatePlanRuleInput[]).map((r) => ({
                    ruleType: r.ruleType,
                    multiplier: Number(r.multiplier ?? 1),
                    value: r.value ?? null,
                })),
            },
            seasonalRates: {
                create: (seasonalRates as SeasonalRateInput[]).map((s) => ({
                    name: s.name,
                    startDate: new Date(s.startDate),
                    endDate: new Date(s.endDate),
                    multiplier: Number(s.multiplier ?? 1),
                })),
            },
        },
        include: { rules: true, seasonalRates: true },
    });

    return NextResponse.json({ plan }, { status: 201 });
}

// PUT – update or toggle active/inactive
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, RATE_PLAN_WRITE_ROLES)) {
        return NextResponse.json({ error: "Hotel Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive, ...updates } = body;
    const existing = await prisma.ratePlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rate plan not found" }, { status: 404 });
    if (!resolveRequestedHotel(access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plan = await prisma.ratePlan.update({
        where: { id },
        data: {
            name: typeof updates.name === "string" ? updates.name : undefined,
            code: typeof updates.code === "string" ? updates.code.toUpperCase() : undefined,
            description: typeof updates.description === "string" ? updates.description : undefined,
            baseMultiplier: updates.baseMultiplier !== undefined ? Number(updates.baseMultiplier) : undefined,
            cancellationHours: updates.cancellationHours !== undefined ? Number(updates.cancellationHours) : undefined,
            refundPolicy: typeof updates.refundPolicy === "string" ? updates.refundPolicy : undefined,
            mealPlan: typeof updates.mealPlan === "string" ? updates.mealPlan : undefined,
            isActive: typeof isActive === "boolean" ? isActive : undefined,
        },
        include: { rules: true, seasonalRates: true },
    });

    return NextResponse.json({ plan });
}

// DELETE – soft-deactivate a rate plan
export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = getRequestAccess(req, session);
    if (!hasAccessRole(access, RATE_PLAN_WRITE_ROLES)) {
        return NextResponse.json({ error: "Hotel Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const existing = await prisma.ratePlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rate plan not found" }, { status: 404 });
    if (!resolveRequestedHotel(access, existing.hotelId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.ratePlan.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
}
