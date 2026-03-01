import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || (!session.roles.includes("SUPER_ADMIN") && !session.roles.includes("OWNER"))) {
            return NextResponse.json({ error: "Unauthorized access to CRM" }, { status: 403 });
        }

        const leads = await prisma.hotelLead.findMany({
            orderBy: { updatedAt: "desc" }
        });

        return NextResponse.json(leads);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        // Marketing or Owner can add leads. For now, we'll let any logged-in staff do it via the generic API.
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { hotelName, contactPerson, contactEmail, contactMobile, estimatedValue, notes } = body;

        const newLead = await prisma.hotelLead.create({
            data: {
                hotelName,
                contactPerson,
                contactEmail,
                contactMobile,
                estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
                notes,
                status: "Scratch"
            }
        });

        return NextResponse.json({ success: true, lead: newLead });
    } catch (e) {
        return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        const updatedLead = await prisma.hotelLead.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ success: true, lead: updatedLead });
    } catch (e) {
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}
