"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type NightAudit = {
    id: string; auditDate: string; status: string; isDayClosed: boolean;
    roomRevenue: number; fbRevenue: number; amenityRevenue: number;
    otherRevenue: number; totalRevenue: number;
    occupiedRooms: number; totalRooms: number; occupancyPct: number;
    closedAt?: string; notes?: string;
};
type Hotel = { id: string; name: string };

const statusColor: Record<string, "success" | "warning" | "danger" | "neutral"> = {
    Closed: "success", Open: "warning", Reopened: "danger",
};

export default function NightAuditPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [audits, setAudits] = useState<NightAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selected, setSelected] = useState<NightAudit | null>(null);
    const [closeNote, setCloseNote] = useState("");

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const data = await fetch(`/api/night-audit?hotelId=${hotelId}`).then(r => r.json());
        setAudits(data.audits || []);
        setLoading(false);
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const initToday = async () => {
        setProcessing(true);
        await fetch("/api/night-audit", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotelId, auditDate: new Date().toISOString() }),
        });
        await load();
        setProcessing(false);
    };

    const closeDay = async () => {
        if (!selected) return;
        setProcessing(true);
        await fetch("/api/night-audit", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selected.id, action: "close", notes: closeNote }),
        });
        setSelected(null); setCloseNote("");
        await load();
        setProcessing(false);
    };

    const reopenDay = async (audit: NightAudit) => {
        const reason = prompt("Admin Override: Enter reason for reopening this closed day:");
        if (!reason) return;
        await fetch("/api/night-audit", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: audit.id, action: "reopen", reopenReason: reason }),
        });
        await load();
    };

    const today = audits.find(a => new Date(a.auditDate).toDateString() === new Date().toDateString());

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>🌙 Night Audit</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Daily financial close, revenue freeze, and occupancy snapshot</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" onClick={initToday} loading={processing}>
                        {today ? "Refresh Today" : "▶ Open Today's Audit"}
                    </Button>
                </div>
            </div>

            {/* Today's snapshot */}
            {today && (
                <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1.25rem", marginBottom: "1rem" }}>
                        {[
                            { label: "Room Revenue", val: `₹${today.roomRevenue.toLocaleString("en-IN")}`, color: "#10b981" },
                            { label: "F&B Revenue", val: `₹${today.fbRevenue.toLocaleString("en-IN")}`, color: "#6366f1" },
                            { label: "Amenity / Other", val: `₹${(today.amenityRevenue + today.otherRevenue).toLocaleString("en-IN")}`, color: "#f59e0b" },
                            { label: "Total Revenue", val: `₹${today.totalRevenue.toLocaleString("en-IN")}`, color: "var(--accent-gold)" },
                            { label: "Occupancy", val: `${today.occupancyPct}%`, color: today.occupancyPct >= 70 ? "#10b981" : "#f59e0b" },
                            { label: "Rooms Occupied", val: `${today.occupiedRooms}/${today.totalRooms}`, color: "#3b82f6" },
                        ].map(s => (
                            <Card key={s.label} title={s.label}>
                                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.val}</div>
                            </Card>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: "1rem", padding: "1.25rem", background: today.isDayClosed ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${today.isDayClosed ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`, borderRadius: "12px", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                                {today.isDayClosed ? "✅ Day Closed & Locked" : "⚠️ Day Not Yet Closed"}
                            </span>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                                {today.isDayClosed
                                    ? `Closed at ${new Date(today.closedAt!).toLocaleTimeString("en-IN")}`
                                    : "All reservations and invoices are still editable. Close the day to freeze financials."}
                            </p>
                        </div>
                        {!today.isDayClosed ? (
                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                <input value={closeNote} onChange={e => setCloseNote(e.target.value)} placeholder="Closing notes..."
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px", width: "220px" }} />
                                <Button variant="primary" onClick={() => { setSelected(today); closeDay(); }} loading={processing}>
                                    🔒 Close Day
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" onClick={() => reopenDay(today)}>🔓 Reopen (Admin)</Button>
                        )}
                    </div>
                </div>
            )}

            {/* History */}
            <Card title="Audit History" subtitle="Past 60 days — closed days are financially frozen">
                {loading ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading…</div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                {["Date", "Status", "Room Rev.", "F&B Rev.", "Total Rev.", "Occupancy", ""].map(h => (
                                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {audits.map(a => (
                                <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)", opacity: a.isDayClosed ? 0.8 : 1 }}>
                                    <td style={{ padding: "0.9rem 1rem", fontWeight: 600 }}>{new Date(a.auditDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</td>
                                    <td style={{ padding: "0.9rem 1rem" }}>
                                        <Badge variant={statusColor[a.status] || "neutral"}>
                                            {a.isDayClosed ? "🔒 " : ""}{a.status}
                                        </Badge>
                                    </td>
                                    <td style={{ padding: "0.9rem 1rem" }}>₹{a.roomRevenue.toLocaleString("en-IN")}</td>
                                    <td style={{ padding: "0.9rem 1rem" }}>₹{a.fbRevenue.toLocaleString("en-IN")}</td>
                                    <td style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>₹{a.totalRevenue.toLocaleString("en-IN")}</td>
                                    <td style={{ padding: "0.9rem 1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <div style={{ height: "6px", width: "80px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}>
                                                <div style={{ height: "100%", width: `${a.occupancyPct}%`, background: a.occupancyPct >= 70 ? "#10b981" : "#f59e0b", borderRadius: "3px" }} />
                                            </div>
                                            <span style={{ fontSize: "0.85rem" }}>{a.occupancyPct}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "0.9rem 1rem" }}>
                                        {a.isDayClosed && <Button size="sm" variant="outline" onClick={() => reopenDay(a)}>Reopen</Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "#6366f1", fontSize: "0.9rem" }}>🔒 Night Audit Locking Rules</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>• Closed days prevent editing invoices and reservations</span>
                    <span>• Super Admin can reopen with a mandatory reason</span>
                    <span>• Revenue figures are frozen at close time for audit</span>
                    <span>• Reopen action is logged in the Audit Trail</span>
                </div>
            </div>
        </div>
    );
}
