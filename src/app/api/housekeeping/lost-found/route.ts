import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");
    const status = searchParams.get("status");

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    if (status) where.status = status;

    try {
        const items = await prisma.lostAndFound.findMany({
            where,
            orderBy: { foundDate: "desc" },
        });
        return NextResponse.json({ items });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { hotelId, itemName, description, foundLocation, foundByName, guestName, guestContact } = body;

        const item = await prisma.lostAndFound.create({
            data: { hotelId, itemName, description, foundLocation, foundByName, guestName, guestContact, status: "Found" },
        });
        return NextResponse.json({ item }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, guestName, guestContact } = body;

        const item = await prisma.lostAndFound.update({
            where: { id },
            data: {
                status, guestName, guestContact,
                resolvedAt: status === "Claimed" || status === "Disposed" ? new Date() : undefined,
            },
        });
        return NextResponse.json({ item });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
