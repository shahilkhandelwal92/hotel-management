"use client";

import { useState, useEffect } from "react";

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

    if (loading || !data) return <div style={{ padding: "4rem", textAlign: "center" }}>Loading Financial Report...</div>;

    const hotel = hotels.find(h => h.id === hotelId);
    const s = data.summary;

    const exportCSV = () => {
        if (!data?.monthlyTrend) return;
        const rows = [["Month", "Room Revenue", "Restaurant", "Events", "Total", "Expenses", "Profit", "TDS"],
        ...data.monthlyTrend.map((m: any) => {
            const total = m.roomRev + m.restRev + m.eventRev;
            return [m.month, m.roomRev, m.restRev, m.eventRev, total, m.expenses, total - m.expenses, m.tds];
        })];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `financial_report_${hotel?.name ?? "hotel"}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    return (
        <div style={{ padding: "2rem", maxWidth: 1100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Financial Report — {hotel?.name ?? "Loading..."}</h1>
                    <p style={{ color: "var(--text-secondary)", margin: "0.3rem 0 0" }}>FY {data.fiscalYear} · {hotel?.location}</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && <select value={hotelId} onChange={e => setHotelId(e.target.value)} style={{ padding: "0.5rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}>
                        {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>}
                    <button onClick={exportCSV} style={{ padding: "0.7rem 1.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>⬇️ Export CSV</button>
                </div>
            </div>

            {/* P&L Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {[
                    { label: "Total Revenue", value: cr(s.totalRevenue), color: "#3b82f6" },
                    { label: "Room Revenue", value: cr(s.roomRevenue), color: "#8b5cf6" },
                    { label: "Restaurant", value: cr(s.restaurantRevenue), color: "#f59e0b" },
                    { label: "Events", value: cr(s.eventRevenue), color: "#06b6d4" },
                    { label: "Total Expenses", value: cr(s.totalExpenses), color: "#ef4444" },
                    { label: "Net Profit", value: cr(s.netProfit), color: "#10b981", sub: `Margin: ${s.netProfitMargin}%` },
                ].map((c, i) => (
                    <div key={i} style={{ padding: "1.2rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>{c.label}</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                        {c.sub && <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{c.sub}</div>}
                    </div>
                ))}
            </div>

            {/* Monthly Table */}
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Monthly Breakdown</h2>
            <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-secondary)" }}>
                            {["Month", "Room", "Restaurant", "Events", "Total Revenue", "Expenses", "Profit", "TDS"].map(h => (
                                <th key={h} style={{ padding: "0.8rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.monthlyTrend.map((m: any, i: number) => {
                            const totalRev = m.roomRev + m.restRev + m.eventRev;
                            const profit = totalRev - m.expenses;
                            return (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "0.7rem 0.8rem", fontWeight: 600, textAlign: "right" }}>{m.month}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.roomRev)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.restRev)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.eventRev)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: 700, color: "#3b82f6" }}>{fmt(totalRev)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: "#ef4444" }}>{fmt(m.expenses)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: profit > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{fmt(profit)}</td>
                                    <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: "#94a3b8" }}>{fmt(m.tds)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* TDS */}
            <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <h3 style={{ margin: "0 0 1rem" }}>TDS Deductions — Income Tax Act 1961</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                    {data.tdsBreakdown.map((t: any, i: number) => (
                        <div key={i} style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>{t.section}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Rate: {t.rate}</div>
                            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.5rem" }}>{fmt(t.amount)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
