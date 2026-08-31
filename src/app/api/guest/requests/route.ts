import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestStaySession } from "@/lib/guestStay";

const REQUEST_TYPES = [
    "Extra Bed",
    "Housekeeping",
    "Laundry",
    "Maintenance",
    "Luggage Assistance",
    "Wake-up Call",
    "Other",
];

export async function POST(request: NextRequest) {
    const stay = await getGuestStaySession();
    if (!stay) return NextResponse.json({ error: "Guest stay session expired" }, { status: 401 });
    if (stay.status !== "CheckedIn") {
        return NextResponse.json({ error: "Service requests are available after check-in" }, { status: 422 });
    }

    const { requestType, notes } = await request.json();
    if (!REQUEST_TYPES.includes(requestType)) {
        return NextResponse.json({ error: "Choose a valid service request" }, { status: 400 });
    }

    const detail = typeof notes === "string" && notes.trim()
        ? `${requestType}: ${notes.trim().slice(0, 240)}`
        : requestType;
    const guestRequest = await prisma.guestRequest.create({
        data: {
            reservationId: stay.id,
            type: requestType,
            details: detail,
            status: "Pending",
            amount: 0,
        },
    });

    return NextResponse.json({ guestRequest }, { status: 201 });
}
