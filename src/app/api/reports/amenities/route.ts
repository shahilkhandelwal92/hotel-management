import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReportAccess } from "@/lib/reportAccess";

function csvCell(value: unknown) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const reportAccess = await getReportAccess(request, searchParams.get("hotelId"));
    if (!reportAccess) return NextResponse.json({ error: "Accounting access required" }, { status: 403 });
    if (!reportAccess.hotelId) return NextResponse.json({ error: "Choose an active property" }, { status: 403 });

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const bookings = await prisma.amenityBooking.findMany({
        where: {
            hotelId: reportAccess.hotelId,
            ...(startDate && endDate ? {
                date: {
                    gte: new Date(`${startDate}T00:00:00.000Z`),
                    lte: new Date(`${endDate}T23:59:59.999Z`),
                },
            } : {}),
        },
        include: { amenity: true },
        orderBy: { date: "desc" },
    });

    const rows = [
        ["Booking ID", "Date", "Start Time", "End Time", "Service", "Pricing Type", "Guest Name", "Guest Contact", "Room Number", "Total Amount", "Payment Status", "Status"],
        ...bookings.map((booking) => [
            booking.id,
            (booking.date || booking.startTime).toLocaleDateString("en-IN"),
            booking.startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            booking.endTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            booking.amenity.name,
            booking.amenity.pricingType,
            booking.guestName,
            booking.guestPhone || booking.guestContact || "N/A",
            booking.roomNumber || "Walk-in",
            Number(booking.totalAmount).toFixed(2),
            booking.paymentStatus,
            booking.status,
        ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="amenity-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
