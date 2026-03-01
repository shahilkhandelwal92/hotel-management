"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const cr = (n: number) => `₹${(n / 10000000).toFixed(2)} Cr`;

export default function FinancialReportPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/reports/financial")
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading Financial Report...</div>;

    const s = data.summary;

    return (
        <div style={{ padding: "2rem", maxWidth: 1200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Financial Report</h1>
                    <p style={{ color: "var(--text-secondary)", margin: "0.3rem 0 0" }}>FY {data.fiscalYear} · All Properties · Consolidated P&L</p>
                </div>
                <div style={{ display: "flex", gap: "0.8rem" }}>
                    <button style={{ padding: "0.7rem 1.2rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "8px", cursor: "pointer" }}>📊 Download P&L</button>
                    <button style={{ padding: "0.7rem 1.2rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>📥 Download for CA</button>
                </div>
            </div>

            {/* P&L Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {[
                    { label: "Total Revenue", value: cr(s.totalRevenue), color: "#3b82f6" },
                    { label: "Room Revenue", value: cr(s.roomRevenue), color: "#8b5cf6", sub: `${((s.roomRevenue / s.totalRevenue) * 100).toFixed(0)}% of total` },
                    { label: "Restaurant Revenue", value: cr(s.restaurantRevenue), color: "#f59e0b", sub: `${((s.restaurantRevenue / s.totalRevenue) * 100).toFixed(0)}% of total` },
                    { label: "Event Revenue", value: cr(s.eventRevenue), color: "#06b6d4", sub: `${((s.eventRevenue / s.totalRevenue) * 100).toFixed(0)}% of total` },
                    { label: "Total Expenses", value: cr(s.totalExpenses), color: "#ef4444" },
                    { label: "EBITDA", value: cr(s.ebitda), color: "#10b981", sub: `Margin: ${s.ebitdaMargin}%` },
                    { label: "Net Profit", value: cr(s.netProfit), color: "#10b981", sub: `Margin: ${s.netProfitMargin}%` },
                    { label: "TDS Deducted", value: cr(s.totalTDSDeducted), color: "#94a3b8" },
                ].map((c, i) => (
                    <div key={i} style={{ padding: "1.2rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>{c.label}</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                        {c.sub && <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{c.sub}</div>}
                    </div>
                ))}
            </div>

            {/* Monthly Trend Table */}
            <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Monthly Revenue Trend — FY {data.fiscalYear}</h2>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ background: "var(--bg-secondary)" }}>
                                {["Month", "Room Rev", "Restaurant Rev", "Event Rev", "Total Rev", "Expenses", "EBITDA", "TDS Deducted"].map(h => (
                                    <th key={h} style={{ padding: "0.8rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.monthlyTrend.map((m: any, i: number) => {
                                const totalRev = m.roomRev + m.restRev + m.eventRev;
                                const ebitda = totalRev - m.expenses;
                                return (
                                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "0.7rem 0.8rem", fontWeight: 600 }}>{m.month}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.roomRev)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.restRev)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right" }}>{fmt(m.eventRev)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: 700, color: "#3b82f6" }}>{fmt(totalRev)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: "#ef4444" }}>{fmt(m.expenses)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: "#10b981", fontWeight: 600 }}>{fmt(ebitda)}</td>
                                        <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", color: "#94a3b8" }}>{fmt(m.tds)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TDS Section-wise */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>TDS Deductions (Income Tax Act 1961)</h3>
                    {data.tdsBreakdown.map((t: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>{t.section}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Rate: {t.rate}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: "#f59e0b" }}>{fmt(t.amount)}</div>
                        </div>
                    ))}
                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span>Total TDS</span>
                        <span style={{ color: "#f59e0b" }}>{fmt(s.totalTDSDeducted)}</span>
                    </div>
                </div>

                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Compliance Status</h3>
                    {[
                        { label: "GST Returns Filed", status: data.complianceStatus.gstFiled },
                        { label: "TDS Returns Filed (Form 24Q/26Q)", status: data.complianceStatus.tdsFiled },
                        { label: "Income Tax Return (ITR-6)", status: data.complianceStatus.itrFiled },
                        { label: "Tax Audit Required (>₹1Cr)", status: data.complianceStatus.auditRequired },
                        { label: "Luxury Tax Applicable", status: data.complianceStatus.luxuryTaxApplicable },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.label}</span>
                            <span style={{
                                padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600,
                                background: item.status ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                color: item.status ? "#10b981" : "#ef4444"
                            }}>
                                {item.status ? "✓ Yes" : "✗ No"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
