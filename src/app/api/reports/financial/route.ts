import { NextResponse } from 'next/server';

// Financial P&L report API
// Covers Room Revenue, Restaurant, Events, Expenses, TDS
// Indian compliance: TDS 194C (10%), Luxury Tax

function generateFinancialData(hotelId?: string) {
    const currentFY = '2024-25';

    const hotels = [
        {
            id: 'hotel_1',
            name: 'The Grand Imperial',
            location: 'Mumbai',
            gstin: '27AABCT1234C1Z5',
            pan: 'AABCT1234C',
            rooms: 120,
            category: '5-Star',
        },
        {
            id: 'hotel_2',
            name: 'Royal Orchid',
            location: 'Delhi',
            gstin: '07AABCR5678D1Z2',
            pan: 'AABCR5678D',
            rooms: 85,
            category: '4-Star',
        },
        {
            id: 'hotel_3',
            name: 'Sunset Resort & Spa',
            location: 'Goa',
            gstin: '30AABCS9012E1Z9',
            pan: 'AABCS9012E',
            rooms: 45,
            category: '3-Star',
        },
    ].filter(h => !hotelId || h.id === hotelId);

    const monthlyData = [
        { month: 'Apr', roomRev: 4200000, restRev: 850000, eventRev: 1200000, expenses: 2800000, tds: 320000 },
        { month: 'May', roomRev: 3800000, restRev: 780000, eventRev: 900000, expenses: 2600000, tds: 285000 },
        { month: 'Jun', roomRev: 3500000, restRev: 720000, eventRev: 750000, expenses: 2400000, tds: 260000 },
        { month: 'Jul', roomRev: 3200000, restRev: 680000, eventRev: 600000, expenses: 2200000, tds: 240000 },
        { month: 'Aug', roomRev: 3400000, restRev: 700000, eventRev: 680000, expenses: 2300000, tds: 255000 },
        { month: 'Sep', roomRev: 3900000, restRev: 760000, eventRev: 850000, expenses: 2550000, tds: 295000 },
        { month: 'Oct', roomRev: 4500000, restRev: 920000, eventRev: 1400000, expenses: 3000000, tds: 345000 },
        { month: 'Nov', roomRev: 4800000, restRev: 980000, eventRev: 1600000, expenses: 3200000, tds: 368000 },
        { month: 'Dec', roomRev: 5200000, restRev: 1050000, eventRev: 2100000, expenses: 3500000, tds: 402000 },
        { month: 'Jan', roomRev: 4600000, restRev: 940000, eventRev: 1500000, expenses: 3100000, tds: 355000 },
        { month: 'Feb', roomRev: 4300000, restRev: 880000, eventRev: 1200000, expenses: 2900000, tds: 332000 },
        { month: 'Mar', roomRev: 4700000, restRev: 960000, eventRev: 1800000, expenses: 3250000, tds: 362000 },
    ];

    // Scale for single hotel vs all
    const scale = hotelId ? 0.33 : 1;
    const scaled = monthlyData.map(m => ({
        ...m,
        roomRev: Math.round(m.roomRev * scale),
        restRev: Math.round(m.restRev * scale),
        eventRev: Math.round(m.eventRev * scale),
        expenses: Math.round(m.expenses * scale),
        tds: Math.round(m.tds * scale),
    }));

    const totalRoomRev = scaled.reduce((s, m) => s + m.roomRev, 0);
    const totalRestRev = scaled.reduce((s, m) => s + m.restRev, 0);
    const totalEventRev = scaled.reduce((s, m) => s + m.eventRev, 0);
    const totalRevenue = totalRoomRev + totalRestRev + totalEventRev;
    const totalExpenses = scaled.reduce((s, m) => s + m.expenses, 0);
    const totalTDS = scaled.reduce((s, m) => s + m.tds, 0);
    const ebitda = totalRevenue - totalExpenses;
    const taxProvision = ebitda * 0.25; // 25% corporate tax
    const netProfit = ebitda - taxProvision;

    // TDS Section-wise breakdown
    const tdsBreakdown = [
        { section: '194C - Contractor Payments', amount: Math.round(totalTDS * 0.30), rate: '2%' },
        { section: '194I - Rent', amount: Math.round(totalTDS * 0.25), rate: '10%' },
        { section: '194J - Professional Services', amount: Math.round(totalTDS * 0.20), rate: '10%' },
        { section: '192B - Salaries', amount: Math.round(totalTDS * 0.25), rate: 'Slab Rate' },
    ];

    return {
        fiscalYear: currentFY,
        hotels,
        summary: {
            totalRevenue,
            roomRevenue: totalRoomRev,
            restaurantRevenue: totalRestRev,
            eventRevenue: totalEventRev,
            totalExpenses,
            ebitda,
            ebitdaMargin: ((ebitda / totalRevenue) * 100).toFixed(1),
            taxProvision,
            netProfit,
            netProfitMargin: ((netProfit / totalRevenue) * 100).toFixed(1),
            totalTDSDeducted: totalTDS,
        },
        monthlyTrend: scaled,
        tdsBreakdown,
        complianceStatus: {
            gstFiled: true,
            tdsFiled: true,
            itrFiled: false,
            auditRequired: totalRevenue > 10000000,
            luxuryTaxApplicable: hotels.some(h => h.category === '5-Star'),
        },
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const hotelId = url.searchParams.get('hotelId') || undefined;
    const data = generateFinancialData(hotelId);
    return NextResponse.json(data);
}
