"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const cr = (n: number) => `₹${(n / 10000000).toFixed(2)} Cr`;

export default function AdminFinancialReportPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hotels, setHotels] = useState<any[]>([]);
    const [hotelId, setHotelId] = useState("");

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    useEffect(() => {
        if (!hotelId) return;
        setLoading(true);
        fetch(`/api/reports/financial?hotelId=${hotelId}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, [hotelId]);

    const exportCSV = () => {
        if (!data?.monthlyTrend) return;
        const hotel = hotels.find(h => h.id === hotelId);
        const rows = [["Month", "Room Revenue", "Restaurant", "Events", "Total", "Expenses", "Profit", "TDS"],
        ...data.monthlyTrend.map((m: any) => {
            const total = m.roomRev + m.restRev + m.eventRev;
            return [m.month, m.roomRev, m.restRev, m.eventRev, total, m.expenses, total - m.expenses, m.tds];
        })];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `financial_report_${hotel?.name ?? "hotel"}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    if (loading || !data) return <div style={{ padding: "4rem", textAlign: "center", color: 'var(--text-secondary)' }}>Loading Financial Intelligence...</div>;

    const s = data.summary;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Executive Financial Insights</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Fiscal Year {data.fiscalYear} &bull; Comparative Profit & Loss analysis.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    {hotels.length > 1 && (
                        <select
                            value={hotelId}
                            onChange={e => setHotelId(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.8rem', borderRadius: '8px' }}
                        >
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" size="sm" onClick={exportCSV}>Export FY Statement</Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2.5rem' }}>
                <Card title="Total Revenue" subtitle="Gross income across all channels">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{cr(s.totalRevenue)}</div>
                </Card>
                <Card title="Operational Profit" subtitle="Earnings before interest/tax">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{cr(s.netProfit)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Margin: {s.netProfitMargin}%</div>
                </Card>
                <Card title="Total Expenses" subtitle="Opex & Maintenance cost">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{cr(s.totalExpenses)}</div>
                </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <Card title="Room Revenue" subtitle="Accommodations">
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{cr(s.roomRevenue)}</div>
                </Card>
                <Card title="F&B Revenue" subtitle="Restaurant & Room Service">
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{cr(s.restaurantRevenue)}</div>
                </Card>
                <Card title="MICE Revenue" subtitle="Events & Banquets">
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>{cr(s.eventRevenue)}</div>
                </Card>
            </div>

            <Card title="Monthly Performance Trend" subtitle="Comparative analysis of revenue vs expenses">
                <Table
                    headers={["Month", "Room Rev", "F&B Rev", "Events", "Total Gross", "Expenses", "Monthly Profit"]}
                    loading={loading}
                >
                    {data.monthlyTrend.map((m: any, i: number) => {
                        const totalRev = m.roomRev + m.restRev + m.eventRev;
                        const profit = totalRev - m.expenses;
                        return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{m.month}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>{fmt(m.roomRev)}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>{fmt(m.restRev)}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>{fmt(m.eventRev)}</td>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{fmt(totalRev)}</td>
                                <td style={{ padding: '1rem 1.5rem', color: '#ef4444' }}>{fmt(m.expenses)}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <Badge variant={profit > 0 ? "success" : "danger"}>{fmt(profit)}</Badge>
                                </td>
                            </tr>
                        );
                    })}
                </Table>
            </Card>

            <div style={{ marginTop: '2.5rem' }}>
                <Card title="Tax Deducted at Source (TDS)" subtitle="Regulatory compliance summary">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {data.tdsBreakdown.map((t: any, i: number) => (
                            <div key={i} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t.section}</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{fmt(t.amount)}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Deduction Rate: {t.rate}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
