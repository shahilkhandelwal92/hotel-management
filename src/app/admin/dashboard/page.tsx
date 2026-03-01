"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import styles from "./dashboard.module.css";

// Demo fallback data
const DEMO_HOTELS = [
    { id: "hotel_1", name: "The Grand Imperial", location: "Mumbai", roomCount: 120, status: "Active", _count: { users: 24, rooms: 120, events: 8 } },
    { id: "hotel_2", name: "Royal Orchid", location: "Delhi", roomCount: 85, status: "Active", _count: { users: 18, rooms: 85, events: 5 } },
    { id: "hotel_3", name: "Sunset Resort & Spa", location: "Goa", roomCount: 45, status: "Active", _count: { users: 12, rooms: 45, events: 3 } },
];

interface Hotel {
    id: string;
    name: string;
    location: string;
    roomCount: number;
    status: string;
    _count?: { users: number; rooms: number; events: number };
}

interface EditForm {
    name: string;
    location: string;
    roomCount: number;
    status: string;
}

export default function DashboardPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [demoMode, setDemoMode] = useState(true);
    const [editHotel, setEditHotel] = useState<Hotel | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [form, setForm] = useState<EditForm>({ name: "", location: "", roomCount: 0, status: "Active" });
    const [saving, setSaving] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState<EditForm>({ name: "", location: "", roomCount: 0, status: "Active" });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [modeRes, hotelsRes] = await Promise.all([
                fetch("/api/settings/demo-mode"),
                fetch("/api/hotels"),
            ]);
            const modeData = await modeRes.json();
            const hotelsData = await hotelsRes.json();
            setDemoMode(modeData.demoMode);
            // Use real data if available, else fall back to demo
            if (hotelsData.hotels && hotelsData.hotels.length > 0) {
                setHotels(hotelsData.hotels);
            } else {
                setHotels(DEMO_HOTELS);
            }
        } catch {
            setHotels(DEMO_HOTELS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const openEdit = (h: Hotel) => {
        setEditHotel(h);
        setForm({ name: h.name, location: h.location, roomCount: h.roomCount, status: h.status });
    };

    const saveEdit = async () => {
        if (!editHotel) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/hotels/${editHotel.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const { hotel } = await res.json();
                setHotels(prev => prev.map(h => h.id === editHotel.id ? { ...h, ...hotel } : h));
                setEditHotel(null);
            }
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        try {
            await fetch(`/api/hotels/${deleteId}`, { method: "DELETE" });
            setHotels(prev => prev.filter(h => h.id !== deleteId));
            setDeleteId(null);
        } finally {
            setSaving(false);
        }
    };

    const addHotel = async () => {
        if (!addForm.name || !addForm.location) return;
        setSaving(true);
        try {
            const res = await fetch("/api/hotels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addForm),
            });
            if (res.ok) {
                const { hotel } = await res.json();
                setHotels(prev => [hotel, ...prev]);
                setShowAdd(false);
                setAddForm({ name: "", location: "", roomCount: 0, status: "Active" });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className={styles.dashboardHeader}>
                <div>
                    <h1 className={styles.title}>Overview</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span style={{
                            padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700,
                            background: demoMode ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                            color: demoMode ? "#f59e0b" : "#10b981",
                            border: `1px solid ${demoMode ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}>
                            {demoMode ? "🧪 Demo Mode" : "🟢 Live Mode"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {demoMode ? "— Sample data, safe to test" : "— Real production data"}
                        </span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button onClick={() => setShowAdd(true)} style={{
                        padding: "0.5rem 1rem", borderRadius: "8px", border: "none",
                        background: "var(--accent-gold)", color: "#000", fontWeight: 700,
                        cursor: "pointer", fontSize: "0.875rem",
                    }}>+ Add Hotel</button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Onboarded Hotels</span>
                    <span className={styles.statValue}>{loading ? "..." : hotels.length}</span>
                    <span className={styles.statChange}>{hotels.filter(h => h.status === "Active").length} active</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Staff</span>
                    <span className={styles.statValue}>{loading ? "..." : hotels.reduce((s, h) => s + (h._count?.users ?? 0), 0)}</span>
                    <span className={styles.statChange}>Across all properties</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Rooms</span>
                    <span className={styles.statValue}>{loading ? "..." : hotels.reduce((s, h) => s + (h.roomCount ?? 0), 0)}</span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Across all hotels</span>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Hotel Properties</h2>
                {loading && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Loading from database...</span>}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.hotelTable}>
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <th>Location</th>
                            <th>Rooms</th>
                            <th>Staff</th>
                            <th>Events</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading hotels...</td></tr>
                        ) : hotels.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>No hotels found. Add your first hotel →</td></tr>
                        ) : hotels.map(hotel => (
                            <tr key={hotel.id}>
                                <td style={{ fontWeight: 600, color: "var(--accent-gold)" }}>{hotel.name}</td>
                                <td>{hotel.location}</td>
                                <td>{hotel.roomCount}</td>
                                <td>{hotel._count?.users ?? 0}</td>
                                <td>{hotel._count?.events ?? 0}</td>
                                <td>
                                    <span style={{
                                        padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600,
                                        background: hotel.status === "Active" ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
                                        color: hotel.status === "Active" ? "#10b981" : "#94a3b8",
                                    }}>{hotel.status}</span>
                                </td>
                                <td>
                                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                        <Link href={`/admin/hotel/${hotel.id}`} style={{
                                            padding: "0.28rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
                                            background: "rgba(201,169,110,0.1)", color: "var(--accent-gold)",
                                            textDecoration: "none", fontWeight: 600, border: "1px solid rgba(201,169,110,0.3)",
                                        }}>Manage →</Link>
                                        <button onClick={() => openEdit(hotel)} style={{
                                            padding: "0.28rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
                                            background: "rgba(59,130,246,0.1)", color: "#3b82f6",
                                            border: "1px solid rgba(59,130,246,0.3)", cursor: "pointer", fontWeight: 600,
                                        }}>✏️</button>
                                        <button onClick={() => setDeleteId(hotel.id)} style={{
                                            padding: "0.28rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
                                            background: "rgba(239,68,68,0.1)", color: "#ef4444",
                                            border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontWeight: 600,
                                        }}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editHotel && (
                <Modal title={`✏️ Edit — ${editHotel.name}`} onClose={() => setEditHotel(null)}>
                    <HotelForm form={form} setForm={setForm} />
                    <ModalActions onCancel={() => setEditHotel(null)} onConfirm={saveEdit} saving={saving} confirmLabel="Save Changes" confirmColor="var(--accent-gold)" confirmTextColor="#000" />
                </Modal>
            )}

            {/* Add Hotel Modal */}
            {showAdd && (
                <Modal title="🏨 Add New Hotel" onClose={() => setShowAdd(false)}>
                    <HotelForm form={addForm} setForm={setAddForm} />
                    <ModalActions onCancel={() => setShowAdd(false)} onConfirm={addHotel} saving={saving} confirmLabel="Create Hotel" confirmColor="var(--accent-gold)" confirmTextColor="#000" />
                </Modal>
            )}

            {/* Delete Confirm Modal */}
            {deleteId && (
                <Modal title="" onClose={() => setDeleteId(null)}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🗑️</div>
                        <h3 style={{ margin: "0 0 0.5rem" }}>Delete Hotel?</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
                            This will permanently remove <strong style={{ color: "var(--text-primary)" }}>{hotels.find(h => h.id === deleteId)?.name}</strong> and all its data. This cannot be undone.
                        </p>
                    </div>
                    <ModalActions onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} saving={saving} confirmLabel="Yes, Delete" confirmColor="#ef4444" confirmTextColor="white" />
                </Modal>
            )}
        </div>
    );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "2rem", width: 480, border: "1px solid var(--border-color)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "90vh", overflowY: "auto" }}>
                {title && <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>{title}</h3>}
                {children}
            </div>
        </div>
    );
}

function HotelForm({ form, setForm }: { form: EditForm; setForm: (f: EditForm) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
                { label: "Hotel Name *", key: "name", type: "text", placeholder: "e.g. The Grand Palace" },
                { label: "Location / City *", key: "location", type: "text", placeholder: "e.g. Mumbai, Maharashtra" },
                { label: "Total Rooms", key: "roomCount", type: "number", placeholder: "100" },
            ].map(f => (
                <div key={f.key}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                        value={(form as any)[f.key] ?? ""}
                        onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value })}
                        style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.9rem", boxSizing: "border-box" }}
                    />
                </div>
            ))}
            <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Suspended</option>
                </select>
            </div>
        </div>
    );
}

function ModalActions({ onCancel, onConfirm, saving, confirmLabel, confirmColor, confirmTextColor }: {
    onCancel: () => void; onConfirm: () => void; saving: boolean;
    confirmLabel: string; confirmColor: string; confirmTextColor: string;
}) {
    return (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
            <button onClick={onCancel} style={{ padding: "0.65rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.875rem" }}>Cancel</button>
            <button onClick={onConfirm} disabled={saving} style={{ padding: "0.65rem 1.5rem", borderRadius: "8px", border: "none", background: confirmColor, color: confirmTextColor, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Please wait..." : confirmLabel}
            </button>
        </div>
    );
}
