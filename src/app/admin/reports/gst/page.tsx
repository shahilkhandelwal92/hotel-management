"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function AdminGSTReportPage() {
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
        fetch(`/api/reports/gst?hotelId=${hotelId}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, [hotelId]);

    const exportCSV = () => {
        if (!data?.roomGST) return;
        const hotel = hotels.find(h => h.id === hotelId);
        const rows = [["Month", "Taxable Value", "GST", "CGST", "SGST", "Guest Type"], ...data.roomGST.map((r: any) => [r.month, r.baseRevenue, r.gstAmount, r.cgst, r.sgst, r.guestType])];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `gst_report_${hotel?.name ?? "hotel"}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    if (loading || !data) return <div style={{ padding: "4rem", textAlign: "center", color: 'var(--text-secondary)' }}>Loading GST Intelligence...</div>;

    const s = data.summary;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>GST Compliance Report</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Fiscal Year 2024-25 &bull; Real-time tax liability tracking.
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
                    <Button variant="outline" size="sm" onClick={exportCSV}>Download GSTR-1 Draft</Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card title="Taxable Value" subtitle="Total base revenue">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{fmt(s.totalTaxableValue)}</div>
                </Card>
                <Card title="Output GST" subtitle="Total tax liability">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{fmt(s.totalGSTLiability)}</div>
                </Card>
                <Card title="Input Credit" subtitle="Available ITC">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{fmt(s.inputTaxCredit)}</div>
                </Card>
                <Card title="Net Payable" subtitle="Balance to pay">
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{fmt(s.netGSTPayable)}</div>
                </Card>
            </div>

            <div style={{ padding: "1rem 1.5rem", background: "rgba(245,158,11,0.05)", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "2rem", display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <strong>Regulatory Notice:</strong> Room tariffs exceeding ₹7,500/night attract 18% GST (9% CGST + 9% SGST). Restaurant services with ITC are also calculated at 18%.
                </p>
            </div>

            <Card title="Detailed Room Revenue" subtitle="Month-wise GST breakdown for accommodations">
                <Table
                    headers={["Month", "Avg Tariff", "Occupancy", "Taxable Value", "GST (18%)", "CGST / SGST", "Type"]}
                    loading={loading}
                >
                    {data.roomGST.map((r: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{r.month}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>{fmt(r.tariff)}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>{r.nights} nights</td>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{fmt(r.baseRevenue)}</td>
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--accent-gold)', fontWeight: 700 }}>{fmt(r.gstAmount)}</td>
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>2x {fmt(r.cgst)}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant={r.guestType === "B2B" ? "info" : "success"}>{r.guestType}</Badge>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '2.5rem' }}>
                <Card title="Restaurant GST" subtitle="F&B revenue tax breakdown (18%)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.restaurantGST.map((r: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: i < data.restaurantGST.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <span style={{ fontWeight: 500 }}>{r.month}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem' }}>Base: {fmt(r.revenue)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>GST: {fmt(r.gstAmount)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="Events & Banquets" subtitle="MICE revenue tax breakdown (18%)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.eventGST.map((e: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: i < data.eventGST.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <span style={{ fontWeight: 500 }}>{e.month}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem' }}>Base: {fmt(e.revenue)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>GST: {fmt(e.gstAmount)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
