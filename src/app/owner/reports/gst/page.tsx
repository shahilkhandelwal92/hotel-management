"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function GSTReportPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"summary" | "gstr1" | "gstr3b">("summary");

    useEffect(() => {
        fetch("/api/reports/gst")
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading GST Report...</div>;

    const s = data.summary;

    return (
        <div style={{ padding: "2rem", maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>GST Reports</h1>
                    <p style={{ color: "var(--text-secondary)", margin: "0.3rem 0 0" }}>FY 2024-25 · All Properties · Indian GST Act 2017</p>
                </div>
                <button style={{ padding: "0.7rem 1.5rem", background: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
                    📥 Download for Filing
                </button>
            </div>

            {/* GST Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {[
                    { label: "Total Taxable Value", value: fmt(s.totalTaxableValue), color: "#3b82f6" },
                    { label: "Total GST Liability", value: fmt(s.totalGSTLiability), color: "#f59e0b", sub: `CGST: ${fmt(s.cgst)} | SGST: ${fmt(s.sgst)}` },
                    { label: "Input Tax Credit (ITC)", value: fmt(s.inputTaxCredit), color: "#10b981" },
                    { label: "Net GST Payable", value: fmt(s.netGSTPayable), color: "#ef4444" },
                ].map((c, i) => (
                    <div key={i} style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>{c.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                        {c.sub && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>{c.sub}</div>}
                    </div>
                ))}
            </div>

            {/* GST Rate Reference */}
            <div style={{ padding: "1.5rem", background: "rgba(59,130,246,0.05)", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.2)", marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", color: "#3b82f6", fontSize: "0.95rem" }}>📋 Applicable GST Slabs (As per GST Council Circular)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.8rem" }}>
                    {[
                        { cat: "Hotel Room (<₹1,000/night)", rate: "0%", note: "Exempt" },
                        { cat: "Hotel Room (₹1,000–₹7,500/night)", rate: "12%", note: "CGST 6% + SGST 6%" },
                        { cat: "Hotel Room (>₹7,500/night)", rate: "18%", note: "CGST 9% + SGST 9%" },
                        { cat: "Restaurant (without ITC)", rate: "5%", note: "Standalone / budget" },
                        { cat: "Restaurant (with ITC)", rate: "18%", note: "5-star hotels" },
                        { cat: "Event / Banquet Hall", rate: "18%", note: "Composite supply" },
                    ].map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 1rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{r.cat}</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>{r.rate}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {(["summary", "gstr1", "gstr3b"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{
                        padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border-color)",
                        background: activeTab === t ? "var(--accent-gold)" : "var(--bg-secondary)",
                        color: activeTab === t ? "#000" : "var(--text-primary)",
                        fontWeight: activeTab === t ? 700 : 400, cursor: "pointer"
                    }}>
                        {t === "summary" ? "Room GST" : t === "gstr1" ? "GSTR-1 (Outward)" : "GSTR-3B Summary"}
                    </button>
                ))}
            </div>

            {activeTab === "summary" && (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                        <thead>
                            <tr style={{ background: "var(--bg-secondary)" }}>
                                {["Hotel", "Month", "Tariff/Night", "Nights", "GST Rate", "Base Revenue", "GST Amount", "CGST", "SGST"].map(h => (
                                    <th key={h} style={{ padding: "0.8rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.roomGST.map((r: any, i: number) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "0.8rem", color: "var(--text-primary)" }}>{r.hotelName}</td>
                                    <td style={{ padding: "0.8rem", color: "var(--text-secondary)" }}>{r.month}</td>
                                    <td style={{ padding: "0.8rem" }}>₹{r.tariff.toLocaleString("en-IN")}</td>
                                    <td style={{ padding: "0.8rem" }}>{r.nights}</td>
                                    <td style={{ padding: "0.8rem" }}>
                                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", background: r.gstRate === 18 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: r.gstRate === 18 ? "#ef4444" : "#10b981", fontSize: "0.8rem", fontWeight: 700 }}>
                                            {r.gstRate}%
                                        </span>
                                    </td>
                                    <td style={{ padding: "0.8rem", fontWeight: 600 }}>{fmt(r.baseRevenue)}</td>
                                    <td style={{ padding: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>{fmt(r.gstAmount)}</td>
                                    <td style={{ padding: "0.8rem" }}>{fmt(r.cgst)}</td>
                                    <td style={{ padding: "0.8rem" }}>{fmt(r.sgst)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "gstr1" && (
                <div>
                    <div style={{ padding: "1rem", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        GSTR-1 captures all outward supplies. B2B includes GSTIN-registered customers. B2C includes unregistered customers.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                        {/* B2B */}
                        <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>B2B Supplies (GSTIN Customers)</h3>
                            {data.gstr1.b2bSupplies.slice(0, 5).map((b: any, i: number) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{b.gstRate}% · {b.invoiceType}</span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{fmt(b.taxableValue)}</span>
                                </div>
                            ))}
                        </div>
                        {/* B2C */}
                        <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>B2C Supplies (Walk-in / Unregistered)</h3>
                            {data.gstr1.b2cSupplies.slice(0, 5).map((b: any, i: number) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{b.gstRate}% GST</span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{fmt(b.taxableValue)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "gstr3b" && (
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: "0 0 1.5rem" }}>GSTR-3B — Monthly Summary of GST Liability</h3>
                    {[
                        { label: "3.1 — Outward taxable supplies (other than zero rated)", value: fmt(s.totalTaxableValue) },
                        { label: "3.2 — Out of supplies made in 3.1", value: "NIL" },
                        { label: "4 — Eligible ITC (Input Tax Credit)", value: fmt(s.inputTaxCredit) },
                        { label: "5.1 — Interest & Late Fee", value: "NIL" },
                        { label: "6.1 — Payment of Tax (IGST)", value: "₹0" },
                        { label: "6.1 — Payment of Tax (CGST)", value: fmt(s.cgst - s.inputTaxCredit / 2) },
                        { label: "6.1 — Payment of Tax (SGST)", value: fmt(s.sgst - s.inputTaxCredit / 2) },
                    ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{row.label}</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.value}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
                        <div style={{ fontWeight: 700, color: "#ef4444", fontSize: "1.1rem" }}>Net Tax Payable: {fmt(s.netGSTPayable)}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>Due by 20th of following month (GSTR-3B)</div>
                    </div>
                </div>
            )}
        </div>
    );
}
