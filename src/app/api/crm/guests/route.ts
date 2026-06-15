import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");
    const segment = searchParams.get("segment");
    const search = searchParams.get("search");

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    if (segment) where.segment = segment;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }

    try {
        const guests = await prisma.guestCRMProfile.findMany({
            where,
            include: {
                reservations: { select: { id: true, bookingRef: true, checkIn: true, checkOut: true, status: true, totalAmount: true }, orderBy: { checkIn: "desc" }, take: 5 },
                loyaltyLedger: { select: { id: true, points: true, type: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
                complaints: { select: { id: true, subject: true, status: true, priority: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
            },
            orderBy: { totalSpend: "desc" },
        });
        return NextResponse.json({ guests });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { hotelId, name, email, phone, address, city, state, country, gstin,
            segment, preferences, idType, idNumber, dateOfBirth, anniversary, nationality } = body;

        if (!hotelId || !name || !phone) {
            return NextResponse.json({ error: "hotelId, name, phone are required" }, { status: 400 });
        }

        const guest = await prisma.guestCRMProfile.create({
            data: {
                hotelId, name, email, phone, address, city, state,
                country: country || "India", gstin, segment: segment || "Leisure",
                preferences: preferences || {}, idType, idNumber,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                anniversary: anniversary ? new Date(anniversary) : null,
                nationality, loyaltyPoints: 0, totalStays: 0, totalSpend: 0,
            },
        });
        return NextResponse.json({ guest }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create guest profile" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...data } = body;

        const guest = await prisma.guestCRMProfile.update({
            where: { id },
            data: {
                name: data.name, email: data.email, phone: data.phone, address: data.address,
                city: data.city, state: data.state, gstin: data.gstin,
                segment: data.segment, preferences: data.preferences, idType: data.idType, idNumber: data.idNumber,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
                anniversary: data.anniversary ? new Date(data.anniversary) : undefined,
            },
        });
        return NextResponse.json({ guest });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
    }
}
