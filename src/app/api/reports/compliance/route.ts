import { NextRequest, NextResponse } from 'next/server';
import { getReportAccess } from '@/lib/reportAccess';

export async function GET(request: NextRequest) {
    const reportAccess = await getReportAccess(request, new URL(request.url).searchParams.get('hotelId'));
    if (!reportAccess) return NextResponse.json({ error: 'Accounting access required' }, { status: 403 });
    const compliance = [
        {
            hotelName: 'The Grand Imperial',
            location: 'Mumbai',
            gstin: '27AABCT1234C1Z5',
            pan: 'AABCT1234C',
            items: [
                { law: 'GST Registration', section: 'CGST Act 2017 Sec 22', status: 'Compliant', expiry: 'N/A', action: '' },
                { law: 'FSSAI License', section: 'Food Safety & Standards Act 2006', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'Fire NOC', section: 'NBC 2016 / State Fire Act', status: 'Compliant', expiry: '2025-09-30', action: '' },
                { law: 'Hotel & Restaurant License', section: 'Hotel & Restaurant Act 1956', status: 'Compliant', expiry: '2025-03-31', action: 'Renew in 30 days' },
                { law: 'Police Verification', section: 'Foreigners Act 1946 / State Order', status: 'Compliant', expiry: 'Annual', action: '' },
                { law: 'Shop & Establishment Act', section: 'State-wise Act', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'PF / ESIC Registration', section: 'EPF Act 1952 / ESI Act 1948', status: 'Compliant', expiry: 'Monthly filings', action: '' },
                { law: 'TDS Compliance', section: 'Income Tax Act 1961', status: 'Compliant', expiry: 'Quarterly', action: '' },
                { law: 'Luxury Tax Registration', section: 'Maharashtra Luxury Tax Act', status: 'Compliant', expiry: '2025-03-31', action: '' },
                { law: 'Trade License', section: 'Municipal Corp Act', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'Drug License (Bar)', section: 'Excise Act', status: 'Compliant', expiry: '2025-03-31', action: 'Renew in 30 days' },
                { law: 'Environmental Clearance', section: 'Environment Protection Act 1986', status: 'Compliant', expiry: 'Perpetual', action: '' },
            ]
        },
        {
            hotelName: 'Royal Orchid',
            location: 'Delhi',
            gstin: '07AABCR5678D1Z2',
            pan: 'AABCR5678D',
            items: [
                { law: 'GST Registration', section: 'CGST Act 2017 Sec 22', status: 'Compliant', expiry: 'N/A', action: '' },
                { law: 'FSSAI License', section: 'Food Safety & Standards Act 2006', status: 'Compliant', expiry: '2025-08-15', action: '' },
                { law: 'Fire NOC', section: 'NBC 2016 / State Fire Act', status: 'Action Required', expiry: '2024-12-31', action: '⚠️ Expired — Renew immediately' },
                { law: 'Hotel & Restaurant License', section: 'Hotel & Restaurant Act 1956', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'Police Verification', section: 'Foreigners Act 1946 / State Order', status: 'Compliant', expiry: 'Annual', action: '' },
                { law: 'Shop & Establishment Act', section: 'Delhi S&E Act 1954', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'PF / ESIC Registration', section: 'EPF Act 1952 / ESI Act 1948', status: 'Compliant', expiry: 'Monthly filings', action: '' },
                { law: 'TDS Compliance', section: 'Income Tax Act 1961', status: 'Compliant', expiry: 'Quarterly', action: '' },
            ]
        },
        {
            hotelName: 'Sunset Resort & Spa',
            location: 'Goa',
            gstin: '30AABCS9012E1Z9',
            pan: 'AABCS9012E',
            items: [
                { law: 'GST Registration', section: 'CGST Act 2017 Sec 22', status: 'Compliant', expiry: 'N/A', action: '' },
                { law: 'FSSAI License', section: 'Food Safety & Standards Act 2006', status: 'Compliant', expiry: '2025-11-30', action: '' },
                { law: 'Fire NOC', section: 'NBC 2016 / State Fire Act', status: 'Compliant', expiry: '2025-06-30', action: '' },
                { law: 'Tourism License (Goa)', section: 'Goa Tourism Act', status: 'Compliant', expiry: '2025-12-31', action: '' },
                { law: 'Bar & Pub License', section: 'Goa Excise Act', status: 'Compliant', expiry: '2025-03-31', action: 'Renew in 30 days' },
                { law: 'PF / ESIC Registration', section: 'EPF Act 1952 / ESI Act 1948', status: 'Compliant', expiry: 'Monthly filings', action: '' },
                { law: 'TDS Compliance', section: 'Income Tax Act 1961', status: 'Compliant', expiry: 'Quarterly', action: '' },
                { law: 'Environment (Coastal Zone)', section: 'CRZ Notification 2019', status: 'Compliant', expiry: 'Perpetual', action: '' },
            ]
        }
    ];

    const summary = {
        totalHotels: compliance.length,
        totalCompliant: compliance.reduce((s, h) => s + h.items.filter(i => i.status === 'Compliant').length, 0),
        totalActionRequired: compliance.reduce((s, h) => s + h.items.filter(i => i.status === 'Action Required').length, 0),
        hotelsWithIssues: compliance.filter(h => h.items.some(i => i.status === 'Action Required')).map(h => h.hotelName),
    };

    return NextResponse.json({ summary, hotels: compliance });
}
