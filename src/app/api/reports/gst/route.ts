import { NextRequest, NextResponse } from 'next/server';
import { getReportAccess } from '@/lib/reportAccess';

// Indian GST Slabs for Hotel Rooms (as per GST Council)
// 0% for tariff < ₹1,000/night
// 12% for tariff ₹1,000 - ₹7,500/night
// 18% for tariff > ₹7,500/night

function getRoomGSTRate(tariff: number): number {
    if (tariff < 1000) return 0;
    if (tariff <= 7500) return 12;
    return 18;
}

// Mock data representing real hotel bookings for GST calculation
// In production this would come from the Booking model in Prisma
function generateGSTData(hotelId?: string) {
    const hotels = hotelId ? [hotelId] : ['hotel_1', 'hotel_2', 'hotel_3'];

    const roomBookings = [
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Jan', tariff: 8500, nights: 120, guestType: 'B2C' },
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Feb', tariff: 8500, nights: 98, guestType: 'B2C' },
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Mar', tariff: 8500, nights: 145, guestType: 'B2B' },
        { hotel: 'hotel_2', hotelName: 'Royal Orchid', month: 'Jan', tariff: 4500, nights: 200, guestType: 'B2C' },
        { hotel: 'hotel_2', hotelName: 'Royal Orchid', month: 'Feb', tariff: 4500, nights: 180, guestType: 'B2C' },
        { hotel: 'hotel_3', hotelName: 'Sunset Resort & Spa', month: 'Jan', tariff: 6500, nights: 90, guestType: 'B2C' },
        { hotel: 'hotel_3', hotelName: 'Sunset Resort & Spa', month: 'Feb', tariff: 6500, nights: 110, guestType: 'B2B' },
    ].filter(b => hotels.includes(b.hotel));

    const restaurantRevenue = [
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Jan', revenue: 485000, rate: 18 },
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Feb', revenue: 420000, rate: 18 },
        { hotel: 'hotel_2', hotelName: 'Royal Orchid', month: 'Jan', revenue: 220000, rate: 5 },
        { hotel: 'hotel_3', hotelName: 'Sunset Resort & Spa', month: 'Jan', revenue: 180000, rate: 5 },
    ].filter(r => hotels.includes(r.hotel));

    const eventRevenue = [
        { hotel: 'hotel_1', hotelName: 'The Grand Imperial', month: 'Jan', revenue: 750000, rate: 18 },
        { hotel: 'hotel_2', hotelName: 'Royal Orchid', month: 'Feb', revenue: 320000, rate: 18 },
    ].filter(e => hotels.includes(e.hotel));

    // Calculate Room GST
    const roomGST = roomBookings.map(b => {
        const gstRate = getRoomGSTRate(b.tariff);
        const baseRevenue = b.tariff * b.nights;
        const gstAmount = (baseRevenue * gstRate) / 100;
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;
        return {
            ...b,
            gstRate,
            baseRevenue,
            gstAmount,
            cgst,
            sgst,
            igst: 0, // IGST for inter-state (simplified)
        };
    });

    // Calculate Restaurant GST
    const restaurantGST = restaurantRevenue.map(r => {
        const gstAmount = (r.revenue * r.rate) / 100;
        return {
            ...r,
            gstAmount,
            cgst: gstAmount / 2,
            sgst: gstAmount / 2,
            igst: 0,
        };
    });

    // Calculate Event GST
    const eventGST = eventRevenue.map(e => {
        const gstAmount = (e.revenue * e.rate) / 100;
        return {
            ...e,
            gstAmount,
            cgst: gstAmount / 2,
            sgst: gstAmount / 2,
            igst: 0,
        };
    });

    // Totals
    const totalRoomBase = roomGST.reduce((s, r) => s + r.baseRevenue, 0);
    const totalRoomGST = roomGST.reduce((s, r) => s + r.gstAmount, 0);
    const totalRestBase = restaurantRevenue.reduce((s, r) => s + r.revenue, 0);
    const totalRestGST = restaurantGST.reduce((s, r) => s + r.gstAmount, 0);
    const totalEventBase = eventRevenue.reduce((s, r) => s + r.revenue, 0);
    const totalEventGST = eventGST.reduce((s, r) => s + r.gstAmount, 0);

    const totalBase = totalRoomBase + totalRestBase + totalEventBase;
    const totalGST = totalRoomGST + totalRestGST + totalEventGST;

    // Input Tax Credit
    const inputTaxCredit = totalGST * 0.18; // approx ITC on purchases

    return {
        summary: {
            totalTaxableValue: totalBase,
            totalGSTLiability: totalGST,
            cgst: totalGST / 2,
            sgst: totalGST / 2,
            igst: 0,
            inputTaxCredit,
            netGSTPayable: totalGST - inputTaxCredit,
        },
        roomGST,
        restaurantGST,
        eventGST,
        gstr1: {
            b2bSupplies: [
                ...roomGST.filter(x => x.guestType === 'B2B').map(x => ({
                    invoiceType: 'Regular',
                    taxableValue: x.baseRevenue,
                    gstRate: x.gstRate,
                    igst: x.igst,
                    cgst: x.cgst,
                    sgst: x.sgst,
                })),
                ...restaurantGST.map(x => ({
                    invoiceType: 'Regular',
                    taxableValue: x.revenue,
                    gstRate: x.rate,
                    igst: x.igst,
                    cgst: x.cgst,
                    sgst: x.sgst,
                })),
                ...eventGST.map(x => ({
                    invoiceType: 'Regular',
                    taxableValue: x.revenue,
                    gstRate: x.rate,
                    igst: x.igst,
                    cgst: x.cgst,
                    sgst: x.sgst,
                })),
            ],
            b2cSupplies: roomGST.filter(x => x.guestType === 'B2C').map(x => ({
                taxableValue: x.baseRevenue,
                gstRate: x.gstRate,
                igst: x.igst,
                cgst: x.cgst,
                sgst: x.sgst,
            })),
        },
    };
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const reportAccess = await getReportAccess(request, url.searchParams.get('hotelId'));
    if (!reportAccess) return NextResponse.json({ error: 'Accounting access required' }, { status: 403 });
    const hotelId = reportAccess.hotelId || undefined;
    const data = generateGSTData(hotelId);
    return NextResponse.json(data);
}
