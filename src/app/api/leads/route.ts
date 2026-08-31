import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const CRM_ROLES = ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "ADMIN", "MANAGER", "MARKETING"];

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !hasAnyRole(session, CRM_ROLES)) {
            return NextResponse.json({ error: "Unauthorized access to CRM" }, { status: 403 });
        }

        const leads = await prisma.hotelLead.findMany({
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(leads);
    } catch (e) {
        console.error("GET /api/leads error:", e);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !hasAnyRole(session, CRM_ROLES)) {
            return NextResponse.json({ error: "Unauthorized access to CRM" }, { status: 403 });
        }

        const body = await request.json();
        const { hotelName, contactPerson, contactEmail, contactMobile, estimatedValue, notes } = body;

        if (!hotelName || typeof hotelName !== "string" || !hotelName.trim()) {
            return NextResponse.json({ error: "hotelName is required" }, { status: 400 });
        }

        const newLead = await prisma.hotelLead.create({
            data: {
                hotelName: hotelName.trim(),
                contactPerson: contactPerson?.trim() || null,
                contactEmail: contactEmail?.trim() || null,
                contactMobile: contactMobile?.trim() || null,
                estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
                notes: notes?.trim() || null,
                status: "Scratch",
            },
        });

        await logAudit({
            userId: session.id,
            module: "Auth",
            action: "CREATE",
            entityId: newLead.id,
            newValue: { hotelName: newLead.hotelName, estimatedValue: newLead.estimatedValue },
            req: request,
        });

        return NextResponse.json({ success: true, lead: newLead }, { status: 201 });
    } catch (e) {
        console.error("POST /api/leads error:", e);
        return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !hasAnyRole(session, CRM_ROLES)) {
            return NextResponse.json({ error: "Unauthorized access to CRM" }, { status: 403 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id) return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });

        const existing = await prisma.hotelLead.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

        const updatedLead = await prisma.hotelLead.update({
            where: { id },
            data: { status: status || existing.status },
        });

        await logAudit({
            userId: session.id,
            module: "Auth",
            action: "UPDATE",
            entityId: id,
            oldValue: { status: existing.status },
            newValue: { status: updatedLead.status },
            req: request,
        });

        return NextResponse.json({ success: true, lead: updatedLead });
    } catch (e) {
        console.error("PATCH /api/leads error:", e);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}
