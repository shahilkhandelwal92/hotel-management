"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";

type Folio = {
    id: string; reservationId: string; folioType: string; balance: number; status: string;
    reservation?: { bookingRef: string; guestName: string; checkIn: string; checkOut: string };
    transactions: FolioTx[];
};
type FolioTx = {
    id: string; type: string; description: string; amount: number; postedAt: string; referenceId?: string;
};
type Hotel = { id: string; name: string };

const txColor: Record<string, "danger" | "success" | "warning" | "neutral"> = {
    Charge: "danger", Payment: "success", Refund: "warning", Adjustment: "neutral", Transfer: "neutral",
};

export default function FolioPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [folios, setFolios] = useState<Folio[]>([]);
    const [selected, setSelected] = useState<Folio | null>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [filter, setFilter] = useState("Open");

    // New transaction form
    const [txForm, setTxForm] = useState({ type: "Charge", description: "", amount: "" });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const data = await fetch(`/api/folio?hotelId=${hotelId}`).then(r => r.json());
        setFolios(data.folios || []);
        setLoading(false);
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const refreshSelected = async (f: Folio) => {
        const data = await fetch(`/api/folio?reservationId=${f.reservationId}`).then(r => r.json());
        setSelected(data.folios?.[0] ?? f);
        await load();
    };

    const postTransaction = async () => {
        if (!selected || !txForm.description || !txForm.amount) return;
        setPosting(true);
        let amount = parseFloat(txForm.amount);
        if (txForm.type === "Payment" || txForm.type === "Refund") amount = -Math.abs(amount);
        await fetch("/api/folio", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "post_transaction", folioId: selected.id, ...txForm, amount }),
        });
        setTxForm({ type: "Charge", description: "", amount: "" });
        await refreshSelected(selected);
        setPosting(false);
    };

    const closeFolio = async (id: string) => {
        await fetch("/api/folio", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "Closed" }),
        });
        await load();
        setSelected(null);
    };

    const filteredFolios = folios.filter(f => filter === "All" || f.status === filter);
    const totalBalance = filteredFolios.reduce((s, f) => s + f.balance, 0);

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>📒 Folio Ledger</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Running guest charge/payment ledger — hotel-grade folio system</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                        {["All", "Open", "Closed", "Transferred"].map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <Card title="Open Folios">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-gold)" }}>
                        {folios.filter(f => f.status === "Open").length}
                    </div>
                </Card>
                <Card title="Total Outstanding">
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: totalBalance > 0 ? "#ef4444" : "#10b981" }}>
                        ₹{totalBalance.toLocaleString("en-IN")}
                    </div>
                </Card>
                <Card title="Room Folios">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6366f1" }}>
                        {folios.filter(f => f.folioType === "Room").length}
                    </div>
                </Card>
                <Card title="Company/Split">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>
                        {folios.filter(f => f.folioType !== "Room").length}
                    </div>
                </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.2fr" : "1fr", gap: "1.5rem" }}>
                {/* Folio List */}
                <Card title="Active Folios">
                    <Table headers={["Guest", "Type", "Balance", "Status", ""]} loading={loading} emptyMessage="No folios found for this hotel.">
                        {filteredFolios.map(f => (
                            <tr key={f.id} onClick={() => setSelected(f)} style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer", background: selected?.id === f.id ? "rgba(201,169,110,0.08)" : "transparent" }}>
                                <td style={{ padding: "0.9rem 1rem" }}>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.reservation?.guestName ?? "—"}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{f.reservation?.bookingRef}</div>
                                </td>
                                <td style={{ padding: "0.9rem 1rem" }}>
                                    <Badge variant="neutral">{f.folioType}</Badge>
                                </td>
                                <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: f.balance > 0 ? "#ef4444" : "#10b981" }}>
                                    ₹{f.balance.toLocaleString("en-IN")}
                                </td>
                                <td style={{ padding: "0.9rem 1rem" }}>
                                    <Badge variant={f.status === "Open" ? "warning" : f.status === "Closed" ? "success" : "neutral"}>{f.status}</Badge>
                                </td>
                                <td style={{ padding: "0.9rem 1rem" }}>
                                    {f.status === "Open" && (
                                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); closeFolio(f.id); }}>Close</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>

                {/* Folio Detail */}
                {selected && (
                    <div>
                        <Card title={`Folio: ${selected.reservation?.guestName}`}
                            subtitle={`${selected.folioType} • ${selected.reservation?.bookingRef}`}
                            headerAction={
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <span style={{ fontWeight: 700, fontSize: "1.1rem", color: selected.balance > 0 ? "#ef4444" : "#10b981" }}>
                                        ₹{selected.balance.toLocaleString("en-IN")}
                                    </span>
                                    <Button size="sm" variant="outline" onClick={() => setSelected(null)}>✕</Button>
                                </div>
                            }>
                            {/* Transaction List */}
                            <div style={{ maxHeight: "260px", overflowY: "auto", marginBottom: "1.25rem" }}>
                                {selected.transactions.map(tx => (
                                    <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{tx.description}</div>
                                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                                                {new Date(tx.postedAt).toLocaleString("en-IN")} • <Badge variant={txColor[tx.type] || "neutral"} style={{ fontSize: "0.65rem" }}>{tx.type}</Badge>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: tx.amount > 0 ? "#ef4444" : "#10b981", fontSize: "0.95rem" }}>
                                            {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                ))}
                                {selected.transactions.length === 0 && (
                                    <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>No transactions yet</div>
                                )}
                            </div>

                            {/* Post Transaction */}
                            {selected.status === "Open" && (
                                <div style={{ padding: "1rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-secondary)" }}>POST TRANSACTION</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.2fr auto", gap: "0.75rem", alignItems: "end" }}>
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Type</label>
                                            <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.55rem 0.7rem", borderRadius: "8px", width: "100%" }}>
                                                {["Charge", "Payment", "Refund", "Adjustment"].map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Description</label>
                                            <input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="e.g. Room service"
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem 0.8rem", borderRadius: "8px", width: "100%" }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Amount ₹</label>
                                            <input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0.00"
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem 0.8rem", borderRadius: "8px", width: "100%" }} />
                                        </div>
                                        <Button variant="primary" onClick={postTransaction} loading={posting}>Post</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
