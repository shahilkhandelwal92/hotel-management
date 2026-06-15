"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";

type AnalyticsData = {
    occupancy: { totalRooms: number; occupiedRooms: number; vacantRooms: number; dirtyRooms: number; occupancyPct: number };
    revenue: { total30d: number; gst30d: number; adr: number; revpar: number };
    monthlyTrend: { month: string; revenue: number }[];
    operations: { openComplaints: number; pendingHousekeeping: number };
};

const barMax = (data: { revenue: number }[] = []) => Math.max(...data.map(d => d.revenue), 1);

export default function ReportsAnalyticsPage() {
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/reports/analytics?hotelId=${hotelId}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Could not load analytics");
            setData(result);
        } catch (loadError) {
            setData(null);
            setError(loadError instanceof Error ? loadError.message : "Could not load analytics");
        } finally {
            setLoading(false);
        }
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    const maxRevenue = data ? barMax(data.monthlyTrend) : 1;

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>📊 Reports & Analytics</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Occupancy, ADR, RevPAR & Revenue insights</p>
                </div>
                {hotels.length > 1 && (
                    <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                        {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                )}
            </div>

            {error && (
                <div role="alert" style={{ marginBottom: "1rem", padding: "0.8rem 1rem", borderRadius: "12px", background: "rgba(220,63,93,0.08)", color: "var(--error)" }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>Loading analytics…</div>
            ) : data ? (
                <>
                    {/* KPI Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                        {[
                            { label: "Occupancy Rate", val: `${data.occupancy.occupancyPct}%`, sub: `${data.occupancy.occupiedRooms}/${data.occupancy.totalRooms} rooms`, color: "#10b981" },
                            { label: "Revenue (30 Days)", val: fmt(data.revenue.total30d), sub: `GST collected: ${fmt(data.revenue.gst30d)}`, color: "var(--accent-gold)" },
                            { label: "ADR", val: fmt(data.revenue.adr), sub: "Avg Daily Rate / room", color: "#6366f1" },
                            { label: "RevPAR", val: fmt(data.revenue.revpar), sub: "Revenue Per Available Room", color: "#f59e0b" },
                            { label: "Pending HK", val: String(data.operations.pendingHousekeeping), sub: "Cleaning tasks due", color: "#ef4444" },
                            { label: "Open Complaints", val: String(data.operations.openComplaints), sub: "Requires attention", color: "#f97316" },
                        ].map(kpi => (
                            <Card key={kpi.label} title={kpi.label} subtitle={kpi.sub}>
                                <div style={{ fontSize: "2rem", fontWeight: 700, color: kpi.color }}>{loading ? "…" : kpi.val}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Room Status Board */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                        <Card title="Room Inventory Status" subtitle="Live room availability breakdown">
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                                {[
                                    { label: "Occupied", val: data.occupancy.occupiedRooms, color: "#ef4444", pct: data.occupancy.occupancyPct },
                                    { label: "Vacant", val: data.occupancy.vacantRooms, color: "#10b981", pct: ((data.occupancy.vacantRooms / Math.max(data.occupancy.totalRooms, 1)) * 100) },
                                    { label: "Dirty / Cleaning", val: data.occupancy.dirtyRooms, color: "#f59e0b", pct: ((data.occupancy.dirtyRooms / Math.max(data.occupancy.totalRooms, 1)) * 100) },
                                ].map(row => (
                                    <div key={row.label}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                                            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{row.label}</span>
                                            <span style={{ fontWeight: 600 }}>{row.val} ({row.pct.toFixed(0)}%)</span>
                                        </div>
                                        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", height: "8px" }}>
                                            <div style={{ width: `${row.pct}%`, height: "8px", background: row.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Monthly Revenue Trend */}
                        <Card title="Monthly Revenue Trend" subtitle="Last 6 months">
                            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", marginTop: "1rem", height: "120px" }}>
                                {data.monthlyTrend.map((m) => {
                                    const heightPct = (m.revenue / maxRevenue) * 100;
                                    return (
                                        <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                                            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                                                <div style={{
                                                    width: "100%", height: `${Math.max(heightPct, 4)}%`,
                                                    background: m.revenue > 0 ? "linear-gradient(180deg, var(--accent-gold), #d97706)" : "rgba(255,255,255,0.1)",
                                                    borderRadius: "4px 4px 0 0", transition: "height 0.6s ease",
                                                    minHeight: "4px",
                                                }} title={`₹${m.revenue.toLocaleString("en-IN")}`} />
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.35rem", textAlign: "center" }}>
                                                {m.month.slice(5)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                Peak: {fmt(maxRevenue)} · Avg: {fmt(Math.round(data.monthlyTrend.reduce((s, m) => s + m.revenue, 0) / 6))}
                            </div>
                        </Card>
                    </div>

                    {/* GST Summary */}
                    <Card title="GST Summary (Last 30 Days)" subtitle="Tax collected breakdown">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "0.5rem" }}>
                            {[
                                { label: "Total Revenue", val: fmt(data.revenue.total30d), color: "var(--accent-gold)" },
                                { label: "GST Collected", val: fmt(data.revenue.gst30d), color: "#6366f1" },
                                { label: "Net Revenue", val: fmt(data.revenue.total30d - data.revenue.gst30d), color: "#10b981" },
                            ].map(item => (
                                <div key={item.label} style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: item.color }}>{item.val}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
