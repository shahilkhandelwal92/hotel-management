"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CompliancePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(0);

    useEffect(() => {
        fetch("/api/reports/compliance")
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading Compliance Report...</div>;

    const s = data.summary;

    return (
        <div style={{ padding: "2rem", maxWidth: 1200 }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Legal Compliance</h1>
                <p style={{ color: "var(--text-secondary)", margin: "0.3rem 0 0" }}>Indian Hotel Laws · Licenses · Regulatory Compliance</p>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Hotels</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700 }}>{s.totalHotels}</div>
                </div>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Compliant Items</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>✓ {s.totalCompliant}</div>
                </div>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Action Required</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>⚠️ {s.totalActionRequired}</div>
                </div>
                <div style={{ padding: "1.5rem", background: "rgba(239,68,68,0.05)", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Hotels with Issues</div>
                    {s.hotelsWithIssues.length === 0
                        ? <div style={{ color: "#10b981", fontWeight: 600 }}>All Clear ✓</div>
                        : s.hotelsWithIssues.map((h: string) => <div key={h} style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.9rem" }}>{h}</div>)
                    }
                </div>
            </div>

            {/* Per Hotel Compliance */}
            {data.hotels.map((hotel: any, idx: number) => (
                <div key={idx} style={{ marginBottom: "1rem", border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
                    <div
                        onClick={() => setExpanded(expanded === idx ? null : idx)}
                        style={{ padding: "1.2rem 1.5rem", background: "var(--bg-secondary)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{hotel.hotelName}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                {hotel.location} · GSTIN: {hotel.gstin} · PAN: {hotel.pan}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            {hotel.items.some((i: any) => i.status === "Action Required") && (
                                <span style={{ padding: "0.3rem 0.8rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>⚠️ Action Needed</span>
                            )}
                            <span style={{ color: "var(--text-secondary)" }}>{expanded === idx ? "▲" : "▼"}</span>
                        </div>
                    </div>

                    {expanded === idx && (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                <thead>
                                    <tr style={{ background: "var(--bg-primary)" }}>
                                        {["License / Requirement", "Legal Provision", "Status", "Expiry", "Action"].map(h => (
                                            <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hotel.items.map((item: any, i: number) => (
                                        <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                            <td style={{ padding: "0.8rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.law}</td>
                                            <td style={{ padding: "0.8rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.section}</td>
                                            <td style={{ padding: "0.8rem 1rem" }}>
                                                <span style={{
                                                    padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600,
                                                    background: item.status === "Compliant" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                                    color: item.status === "Compliant" ? "#10b981" : "#ef4444"
                                                }}>
                                                    {item.status === "Compliant" ? "✓ Compliant" : "⚠️ Action Required"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "0.8rem 1rem", color: "var(--text-secondary)" }}>{item.expiry}</td>
                                            <td style={{ padding: "0.8rem 1rem", color: "#f59e0b", fontWeight: 600 }}>{item.action || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
