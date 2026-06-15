"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type GuestProfile = {
    id: string; name: string; phone: string; email?: string; state?: string; city?: string;
    segment: string; loyaltyPoints: number; totalStays: number; totalSpend: number;
    createdAt: string;
    reservations: { id: string; bookingRef: string; checkIn: string; checkOut: string; status: string; totalAmount: number }[];
    complaints: { id: string; subject: string; status: string; priority: string; createdAt: string }[];
};
type Hotel = { id: string; name: string };

const segmentColor: Record<string, "success" | "warning" | "primary" | "danger"> = {
    Leisure: "success", Corporate: "primary", VIP: "warning", Group: "danger"
};

export default function CRMGuestsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [guests, setGuests] = useState<GuestProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [viewGuest, setViewGuest] = useState<GuestProfile | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [segment, setSegment] = useState("");

    const [form, setForm] = useState({
        name: "", phone: "", email: "", address: "", city: "", state: "",
        gstin: "", segment: "Leisure", idType: "Aadhaar", idNumber: "",
        dateOfBirth: "", anniversary: ""
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const qs = new URLSearchParams({ hotelId, ...(segment && { segment }), ...(search && { search }) });
        const data = await fetch(`/api/crm/guests?${qs}`).then(r => r.json());
        setGuests(data.guests || []);
        setLoading(false);
    }, [hotelId, segment, search]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/crm/guests", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId }),
        });
        setSaving(false); setShowAdd(false); load();
    };

    const segmentCounts = ["Leisure", "Corporate", "VIP", "Group"].map(s => ({
        s, count: guests.filter(g => g.segment === s).length
    }));

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>🎯 Guest CRM</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Guest profiles, loyalty, stay history & preferences</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" onClick={() => setShowAdd(true)}>+ Add Guest</Button>
                </div>
            </div>

            {/* Segment filter */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <Card title="All Guests" style={{ cursor: "pointer", border: !segment ? "1px solid var(--accent-gold)" : undefined }} onClick={() => setSegment("")}>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-gold)" }}>{guests.length}</div>
                </Card>
                {segmentCounts.map(({ s, count }) => (
                    <Card key={s} title={s} style={{ cursor: "pointer", border: segment === s ? "1px solid var(--accent-gold)" : undefined }} onClick={() => setSegment(s)}>
                        <div style={{ fontSize: "2rem", fontWeight: 700 }}>{count}</div>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: "1.5rem" }}>
                <Input placeholder="Search by name, phone, or email…" value={search} onChange={(e: any) => setSearch(e.target.value)} />
            </div>

            <Card title="Guest Profiles" subtitle="Complete CRM view of all hotel guests">
                <Table headers={["Guest", "Contact", "Segment", "Stays", "Total Spend", "Loyalty Pts", "Actions"]} loading={loading}
                    emptyMessage="No guest profiles found. Add your first guest.">
                    {guests.map(g => (
                        <tr key={g.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ fontWeight: 600 }}>{g.name}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{g.city}{g.city && g.state ? ", " : ""}{g.state}</div>
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.9rem" }}>
                                <div>{g.phone}</div>
                                {g.email && <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{g.email}</div>}
                            </td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={segmentColor[g.segment] || "neutral"}>{g.segment}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem", textAlign: "center", fontWeight: 600 }}>{g.totalStays}</td>
                            <td style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--accent-gold)" }}>₹{g.totalSpend.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "1.2rem" }}>⭐</span>
                                    <span style={{ fontWeight: 700 }}>{g.loyaltyPoints}</span>
                                </div>
                            </td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <Button size="sm" variant="outline" onClick={() => setViewGuest(g)}>View Profile</Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Guest Profile Modal */}
            {viewGuest && (
                <Modal isOpen={!!viewGuest} onClose={() => setViewGuest(null)} title={`👤 ${viewGuest.name}`}
                    footer={<Button variant="outline" onClick={() => setViewGuest(null)}>Close</Button>}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                            <div style={{ textAlign: "center", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-gold)" }}>{viewGuest.totalStays}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Stays</div>
                            </div>
                            <div style={{ textAlign: "center", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{(viewGuest.totalSpend / 1000).toFixed(1)}K</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Spend</div>
                            </div>
                            <div style={{ textAlign: "center", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b" }}>⭐{viewGuest.loyaltyPoints}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Loyalty Points</div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>Recent Stays</h4>
                            {viewGuest.reservations.length === 0 ? (
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No stay history</p>
                            ) : viewGuest.reservations.slice(0, 4).map(r => (
                                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                    <div>
                                        <span style={{ fontFamily: "monospace", color: "var(--accent-gold)", fontSize: "0.85rem" }}>{r.bookingRef.slice(0, 12)}</span>
                                        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginLeft: "0.75rem" }}>
                                            {new Date(r.checkIn).toLocaleDateString("en-IN")} → {new Date(r.checkOut).toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                        <span style={{ fontWeight: 600 }}>₹{r.totalAmount.toLocaleString("en-IN")}</span>
                                        <Badge variant={r.status === "CheckedOut" ? "neutral" : "success"}>{r.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {viewGuest.complaints.length > 0 && (
                            <div>
                                <h4 style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>Open Complaints</h4>
                                {viewGuest.complaints.filter(c => c.status === "Open").map(c => (
                                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                        <span>{c.subject}</span>
                                        <Badge variant={c.priority === "Urgent" ? "danger" : "warning"}>{c.priority}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Add Guest Modal */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Guest Profile"
                footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Add Guest</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Full Name *" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
                        <Input label="Phone *" required value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
                        <Input label="Email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
                        <Input label="City" value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
                        <Input label="State" value={form.state} onChange={(e: any) => setForm({ ...form, state: e.target.value })} />
                        <Input label="GSTIN (B2B)" value={form.gstin} onChange={(e: any) => setForm({ ...form, gstin: e.target.value })} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Segment</label>
                            <select value={form.segment} onChange={(e: any) => setForm({ ...form, segment: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                                {["Leisure", "Corporate", "VIP", "Group"].map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e: any) => setForm({ ...form, dateOfBirth: e.target.value })} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
