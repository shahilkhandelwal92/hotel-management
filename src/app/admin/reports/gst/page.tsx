"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function AdminGSTReportPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // hotel_1 = The Grand Imperial (this admin's property)
        fetch("/api/reports/gst?hotelId=hotel_1")
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: "4rem", textAlign: "center" }}>Loading GST Report...</div>;

    const s = data.summary;

    return (
        <div style={{ padding: "2rem", maxWidth: 1100 }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>GST Report — The Grand Imperial</h1>
                <p style={{ color: "var(--text-secondary)", margin: "0.3rem 0 0" }}>GSTIN: 27AABCT1234C1Z5 · FY 2024-25 · Mumbai</p>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                {[
                    { label: "Taxable Value", value: fmt(s.totalTaxableValue), color: "#3b82f6" },
                    { label: "Output GST", value: fmt(s.totalGSTLiability), color: "#f59e0b" },
                    { label: "Input Tax Credit", value: fmt(s.inputTaxCredit), color: "#10b981" },
                    { label: "Net Payable", value: fmt(s.netGSTPayable), color: "#ef4444" },
                ].map((c, i) => (
                    <div key={i} style={{ padding: "1.2rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>{c.label}</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* GST Slabs Reference */}
            <div style={{ padding: "1rem 1.5rem", background: "rgba(245,158,11,0.08)", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "2rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Your Hotel GST Slab:</strong> Tariff &gt; ₹7,500/night → <strong style={{ color: "#10b981" }}>18% GST (CGST 9% + SGST 9%)</strong> |
                Restaurant (5-star with ITC) → <strong style={{ color: "#10b981" }}>18% GST</strong> | Events → <strong style={{ color: "#10b981" }}>18% GST</strong>
            </div>

            {/* Room GST Table */}
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Room Revenue & GST</h2>
            <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-secondary)" }}>
                            {["Month", "Tariff/Night", "Nights Occupied", "Taxable Value", "GST @18%", "CGST @9%", "SGST @9%", "Guest Type"].map(h => (
                                <th key={h} style={{ padding: "0.8rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.roomGST.map((r: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "0.8rem", fontWeight: 600 }}>{r.month}</td>
                                <td style={{ padding: "0.8rem" }}>₹{r.tariff.toLocaleString("en-IN")}</td>
                                <td style={{ padding: "0.8rem" }}>{r.nights}</td>
                                <td style={{ padding: "0.8rem", fontWeight: 600 }}>{fmt(r.baseRevenue)}</td>
                                <td style={{ padding: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>{fmt(r.gstAmount)}</td>
                                <td style={{ padding: "0.8rem" }}>{fmt(r.cgst)}</td>
                                <td style={{ padding: "0.8rem" }}>{fmt(r.sgst)}</td>
                                <td style={{ padding: "0.8rem" }}>
                                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.78rem", background: r.guestType === "B2B" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", color: r.guestType === "B2B" ? "#3b82f6" : "#10b981", fontWeight: 600 }}>{r.guestType}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Restaurant + Events */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Restaurant GST (@18%)</h3>
                    {data.restaurantGST.map((r: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{r.month}</span>
                            <span>Base: {fmt(r.revenue)} → GST: <strong style={{ color: "#f59e0b" }}>{fmt(r.gstAmount)}</strong></span>
                        </div>
                    ))}
                </div>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Event / Banquet GST (@18%)</h3>
                    {data.eventGST.map((e: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{e.month}</span>
                            <span>Base: {fmt(e.revenue)} → GST: <strong style={{ color: "#f59e0b" }}>{fmt(e.gstAmount)}</strong></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
