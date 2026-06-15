"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type Reservation = {
    id: string; bookingRef: string; guestName: string; guestPhone: string; guestEmail?: string;
    guestState?: string; roomId?: string; room?: { number: string; type: string; floor: number };
    checkIn: string; checkOut: string; status: string; bookingType: string; ratePlan: string;
    adults: number; children: number; totalAmount: number; advanceDeposit: number; balanceDue: number;
    includesBreakfast: boolean; specialRequests?: string;
};

type Room = { id: string; number: string; type: string; floor: number; price: number; status: string };
type Hotel = { id: string; name: string };

const statusColors: Record<string, "success" | "warning" | "danger" | "neutral" | "primary"> = {
    Confirmed: "primary", CheckedIn: "success", CheckedOut: "neutral",
    Cancelled: "danger", NoShow: "warning",
};

export default function ReservationsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [actionRes, setActionRes] = useState<Reservation | null>(null);
    const [actionType, setActionType] = useState<"checkin" | "checkout" | "cancel" | "noshow" | null>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        guestName: "", guestPhone: "", guestEmail: "", guestState: "", guestAddress: "", guestCity: "",
        guestGstin: "", idType: "Aadhaar", idNumber: "", roomId: "",
        bookingType: "Individual", ratePlan: "Standard", adults: 1, children: 0,
        checkIn: "", checkOut: "", advanceDeposit: 0, includesBreakfast: false, specialRequests: "",
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        try {
            const [resData, roomData] = await Promise.all([
                fetch(`/api/reservations?hotelId=${hotelId}${statusFilter ? `&status=${statusFilter}` : ""}`).then(r => r.json()),
                fetch(`/api/rooms?hotelId=${hotelId}`).then(r => r.json()),
            ]);
            setReservations(resData.reservations || []);
            setRooms(roomData.rooms || []);
        } finally {
            setLoading(false);
        }
    }, [hotelId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async () => {
        if (!actionRes || !actionType) return;
        setSaving(true);
        try {
            await fetch(`/api/reservations/${actionRes.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: actionType }),
            });
            setActionRes(null); setActionType(null);
            load();
        } finally { setSaving(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await fetch("/api/reservations", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, hotelId }),
            });
            if (res.ok) { setShowAdd(false); load(); }
        } finally { setSaving(false); }
    };

    const statusCounts = {
        all: reservations.length,
        confirmed: reservations.filter(r => r.status === "Confirmed").length,
        checkedIn: reservations.filter(r => r.status === "CheckedIn").length,
        checkout: reservations.filter(r => r.status === "CheckedOut").length,
    };

    const nights = (ci: string, co: string) =>
        Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>🛎 Reservations</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Full PMS booking management</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" onClick={() => setShowAdd(true)}>+ New Reservation</Button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {[
                    { label: "Total", val: statusCounts.all, color: "var(--accent-gold)", filter: "" },
                    { label: "Confirmed", val: statusCounts.confirmed, color: "#6366f1", filter: "Confirmed" },
                    { label: "Checked In", val: statusCounts.checkedIn, color: "#10b981", filter: "CheckedIn" },
                    { label: "Checked Out", val: statusCounts.checkout, color: "var(--text-secondary)", filter: "CheckedOut" },
                ].map(s => (
                    <Card key={s.label} title={s.label} style={{ cursor: "pointer", border: statusFilter === s.filter ? "1px solid var(--accent-gold)" : undefined }}
                        onClick={() => setStatusFilter(s.filter)}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 700, color: s.color }}>{loading ? "…" : s.val}</div>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card title="Reservation Log" subtitle="All bookings across this property">
                <Table headers={["Ref", "Guest", "Room", "Check-In", "Check-Out", "Nights", "Amount", "Status", "Actions"]} loading={loading}
                    emptyMessage="No reservations found. Create your first booking.">
                    {reservations.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem 1.25rem", fontFamily: "monospace", color: "var(--accent-gold)", fontWeight: 600 }}>{r.bookingRef.slice(0, 10)}</td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ fontWeight: 600 }}>{r.guestName}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{r.guestPhone}</div>
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.9rem" }}>
                                {r.room ? <><strong>#{r.room.number}</strong><br /><span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{r.room.type}</span></> : <span style={{ color: "var(--text-secondary)" }}>Unassigned</span>}
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>{new Date(r.checkIn).toLocaleDateString("en-IN")}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>{new Date(r.checkOut).toLocaleDateString("en-IN")}</td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.9rem", textAlign: "center" }}>{nights(r.checkIn, r.checkOut)}</td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ fontWeight: 600 }}>₹{r.totalAmount.toFixed(0)}</div>
                                {r.balanceDue > 0 && <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>Due: ₹{r.balanceDue.toFixed(0)}</div>}
                            </td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={statusColors[r.status] || "neutral"}>{r.status}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    {r.status === "Confirmed" && (
                                        <Button size="sm" variant="primary" onClick={() => { setActionRes(r); setActionType("checkin"); }}>Check In</Button>
                                    )}
                                    {r.status === "CheckedIn" && (
                                        <Button size="sm" variant="secondary" onClick={() => { setActionRes(r); setActionType("checkout"); }}>Check Out</Button>
                                    )}
                                    {r.status === "Confirmed" && (
                                        <Button size="sm" variant="danger" onClick={() => { setActionRes(r); setActionType("cancel"); }}>Cancel</Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Action Modal */}
            <Modal isOpen={!!actionRes} onClose={() => { setActionRes(null); setActionType(null); }}
                title={actionType === "checkin" ? "Confirm Check-In" : actionType === "checkout" ? "Confirm Check-Out" : actionType === "cancel" ? "Cancel Reservation" : "Mark No-Show"}
                footer={<><Button variant="outline" onClick={() => { setActionRes(null); setActionType(null); }}>Back</Button>
                    <Button variant={actionType === "cancel" ? "danger" : "primary"} onClick={handleAction} loading={saving}>Confirm</Button></>}>
                <div style={{ padding: "1rem 0", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                        {actionType === "checkin" ? "🏨" : actionType === "checkout" ? "🚪" : actionType === "cancel" ? "❌" : "⚠️"}
                    </div>
                    <p style={{ color: "#fff", fontSize: "1.1rem" }}>
                        {actionType === "checkin" ? `Check in ${actionRes?.guestName} to Room #${actionRes?.room?.number || "TBD"}?` :
                            actionType === "checkout" ? `Check out ${actionRes?.guestName}? A housekeeping task will be auto-created.` :
                                actionType === "cancel" ? `Cancel reservation for ${actionRes?.guestName}?` : `Mark as no-show?`}
                    </p>
                    {actionRes && <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Ref: {actionRes.bookingRef.slice(0, 12)}</p>}
                </div>
            </Modal>

            {/* New Reservation Modal */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Reservation"
                footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Create Booking</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Guest Name *" required value={form.guestName} onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} />
                        <Input label="Phone *" required value={form.guestPhone} onChange={(e: any) => setForm({ ...form, guestPhone: e.target.value })} />
                        <Input label="Email" value={form.guestEmail} onChange={(e: any) => setForm({ ...form, guestEmail: e.target.value })} />
                        <Input label="State (for GST)" value={form.guestState} onChange={(e: any) => setForm({ ...form, guestState: e.target.value })} placeholder="e.g. Maharashtra" />
                        <Input label="GSTIN (B2B)" value={form.guestGstin} onChange={(e: any) => setForm({ ...form, guestGstin: e.target.value })} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Room</label>
                            <select value={form.roomId} onChange={(e: any) => setForm({ ...form, roomId: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                                <option value="">Unassigned</option>
                                {rooms.filter(r => r.status === "Vacant").map(r => (
                                    <option key={r.id} value={r.id}>#{r.number} – {r.type} (₹{r.price}/night)</option>
                                ))}
                            </select>
                        </div>
                        <Input label="Check-In *" type="date" required value={form.checkIn} onChange={(e: any) => setForm({ ...form, checkIn: e.target.value })} />
                        <Input label="Check-Out *" type="date" required value={form.checkOut} onChange={(e: any) => setForm({ ...form, checkOut: e.target.value })} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Booking Type</label>
                            <select value={form.bookingType} onChange={(e: any) => setForm({ ...form, bookingType: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                                {["Individual", "Group", "Corporate", "Walkin"].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Rate Plan</label>
                            <select value={form.ratePlan} onChange={(e: any) => setForm({ ...form, ratePlan: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                                {["Standard", "Corporate", "OTA", "Walk-in", "Government"].map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <Input label="Adults" type="number" value={form.adults as any} onChange={(e: any) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })} />
                        <Input label="Advance Deposit (₹)" type="number" value={form.advanceDeposit as any} onChange={(e: any) => setForm({ ...form, advanceDeposit: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <input type="checkbox" id="bfast" checked={form.includesBreakfast} onChange={e => setForm({ ...form, includesBreakfast: e.target.checked })} style={{ width: "1.2rem", height: "1.2rem" }} />
                        <label htmlFor="bfast" style={{ color: "#fff", cursor: "pointer" }}>Includes Breakfast</label>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Special Requests</label>
                        <textarea value={form.specialRequests} onChange={(e: any) => setForm({ ...form, specialRequests: e.target.value })}
                            rows={2} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.65rem 1rem", color: "#fff", resize: "vertical" }} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
