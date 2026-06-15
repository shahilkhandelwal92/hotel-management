"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type LostItem = {
    id: string; itemName: string; description?: string; foundLocation?: string;
    foundDate: string; foundByName?: string; guestName?: string; guestContact?: string;
    status: string; resolvedAt?: string;
};
type Hotel = { id: string; name: string };

const statusColor: Record<string, "warning" | "success" | "neutral"> = {
    Found: "warning", Claimed: "success", Disposed: "neutral"
};

export default function LostFoundPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [items, setItems] = useState<LostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [form, setForm] = useState({
        itemName: "", description: "", foundLocation: "", foundByName: "", guestName: "", guestContact: ""
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const data = await fetch(`/api/housekeeping/lost-found?hotelId=${hotelId}${statusFilter ? `&status=${statusFilter}` : ""}`).then(r => r.json());
        setItems(data.items || []);
        setLoading(false);
    }, [hotelId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/housekeeping/lost-found", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId }),
        });
        setSaving(false); setShowAdd(false); load();
    };

    const updateStatus = async (id: string, status: string, guestName?: string, guestContact?: string) => {
        await fetch("/api/housekeeping/lost-found", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status, guestName, guestContact }),
        });
        load();
    };

    const counts = {
        found: items.filter(i => i.status === "Found").length,
        claimed: items.filter(i => i.status === "Claimed").length,
        disposed: items.filter(i => i.status === "Disposed").length,
    };

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>📦 Lost & Found</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Track and resolve lost item reports</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" onClick={() => setShowAdd(true)}>+ Log Found Item</Button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {[
                    { label: "Found", val: counts.found, color: "#f59e0b", filter: "Found" },
                    { label: "Claimed", val: counts.claimed, color: "#10b981", filter: "Claimed" },
                    { label: "Disposed", val: counts.disposed, color: "var(--text-secondary)", filter: "Disposed" },
                ].map(s => (
                    <Card key={s.label} title={s.label} style={{ cursor: "pointer", border: statusFilter === s.filter ? "1px solid var(--accent-gold)" : undefined }}
                        onClick={() => setStatusFilter(statusFilter === s.filter ? "" : s.filter)}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 700, color: s.color }}>{s.val}</div>
                    </Card>
                ))}
            </div>

            <Card title="Lost & Found Log" subtitle="All reported items">
                <Table headers={["Item", "Description", "Found At", "Found By", "Guest", "Date", "Status", "Actions"]} loading={loading}
                    emptyMessage="No lost & found items logged.">
                    {items.map(item => (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>{item.itemName}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.description || "–"}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>{item.foundLocation || "–"}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>{item.foundByName || "–"}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>
                                {item.guestName ? <>{item.guestName}<br /><span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.guestContact}</span></> : "–"}
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.8rem" }}>{new Date(item.foundDate).toLocaleDateString("en-IN")}</td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={statusColor[item.status] || "neutral"}>{item.status}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                {item.status === "Found" && (
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <Button size="sm" variant="primary" onClick={() => updateStatus(item.id, "Claimed")}>Claimed ✓</Button>
                                        <Button size="sm" variant="danger" onClick={() => updateStatus(item.id, "Disposed")}>Dispose</Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Found Item"
                footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Log Item</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Input label="Item Name *" required value={form.itemName} onChange={(e: any) => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Black Wallet" />
                    <Input label="Description" value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} placeholder="Brand, color, contents…" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Found Location" value={form.foundLocation} onChange={(e: any) => setForm({ ...form, foundLocation: e.target.value })} placeholder="e.g. Room 204" />
                        <Input label="Found By (Staff)" value={form.foundByName} onChange={(e: any) => setForm({ ...form, foundByName: e.target.value })} />
                        <Input label="Guest Name (if known)" value={form.guestName} onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} />
                        <Input label="Guest Contact" value={form.guestContact} onChange={(e: any) => setForm({ ...form, guestContact: e.target.value })} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
