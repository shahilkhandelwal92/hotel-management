"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./dashboard.module.css";

interface Hotel {
    id: number;
    name: string;
    location: string;
    rooms: number;
    status: string;
    gstin?: string;
    category?: string;
}

const initialHotels: Hotel[] = [
    { id: 1, name: "The Grand Imperial", location: "Mumbai", rooms: 120, status: "Active", gstin: "27AABCT1234C1Z5", category: "5-Star" },
    { id: 2, name: "Royal Orchid", location: "Delhi", rooms: 85, status: "Active", gstin: "07AABCR5678D1Z2", category: "4-Star" },
    { id: 3, name: "Sunset Resort & Spa", location: "Goa", rooms: 45, status: "Active", gstin: "30AABCS9012E1Z9", category: "3-Star" },
];

export default function DashboardPage() {
    const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
    const [editHotel, setEditHotel] = useState<Hotel | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<Hotel | null>(null);

    const openEdit = (h: Hotel) => { setEditHotel(h); setForm({ ...h }); };
    const closeEdit = () => { setEditHotel(null); setForm(null); };

    const saveEdit = () => {
        if (!form) return;
        setHotels(prev => prev.map(h => h.id === form.id ? form : h));
        closeEdit();
    };

    const confirmDelete = () => {
        if (deleteId == null) return;
        setHotels(prev => prev.filter(h => h.id !== deleteId));
        setDeleteId(null);
    };

    return (
        <div className="animate-fade-in">
            <div className={styles.dashboardHeader}>
                <h1 className={styles.title}>Overview</h1>
                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Indian Map</button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Onboarded Hotels</span>
                    <span className={styles.statValue}>{hotels.length}</span>
                    <span className={styles.statChange}>+12 this month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Subscriptions (INR)</span>
                    <span className={styles.statValue}>₹48.5L</span>
                    <span className={styles.statChange}>+5.2% vs last month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Guest QR Check-ins Today</span>
                    <span className={styles.statValue}>3,450</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contactless flow</span>
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Recent Hotel Activity</h2>
            <div className={styles.tableContainer}>
                <table className={styles.hotelTable}>
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <th>Location</th>
                            <th>Total Rooms</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hotels.map(hotel => (
                            <tr key={hotel.id}>
                                <td style={{ fontWeight: 500, color: 'var(--accent-gold)' }}>{hotel.name}</td>
                                <td>{hotel.location}</td>
                                <td>{hotel.rooms}</td>
                                <td>
                                    <span className={hotel.status === "Active" ? styles.statusActive : undefined}
                                        style={hotel.status !== "Active" ? { padding: "0.2rem 0.6rem", borderRadius: "20px", background: "rgba(148,163,184,0.1)", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600 } : undefined}>
                                        {hotel.status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <Link href={`/admin/hotel/${hotel.id}`} style={{
                                            padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem",
                                            background: "rgba(201,169,110,0.1)", color: "var(--accent-gold)",
                                            textDecoration: "none", fontWeight: 600, border: "1px solid rgba(201,169,110,0.3)",
                                            whiteSpace: "nowrap",
                                        }}>Manage →</Link>
                                        <button onClick={() => openEdit(hotel)} style={{
                                            padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem",
                                            background: "rgba(59,130,246,0.1)", color: "#3b82f6",
                                            border: "1px solid rgba(59,130,246,0.3)", cursor: "pointer", fontWeight: 600,
                                        }}>✏️ Edit</button>
                                        <button onClick={() => setDeleteId(hotel.id)} style={{
                                            padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem",
                                            background: "rgba(239,68,68,0.1)", color: "#ef4444",
                                            border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontWeight: 600,
                                        }}>🗑️ Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editHotel && form && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 999,
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <div style={{
                        background: "var(--bg-secondary)", borderRadius: "16px", padding: "2rem",
                        width: 480, border: "1px solid var(--border-color)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                    }}>
                        <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>✏️ Edit Hotel — {editHotel.name}</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {[
                                { label: "Hotel Name", key: "name", type: "text" },
                                { label: "Location", key: "location", type: "text" },
                                { label: "Total Rooms", key: "rooms", type: "number" },
                                { label: "Category", key: "category", type: "text" },
                                { label: "GSTIN", key: "gstin", type: "text" },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={(form as any)[f.key] ?? ""}
                                        onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value })}
                                        style={{
                                            width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px",
                                            border: "1px solid var(--border-color)", background: "var(--bg-primary)",
                                            color: "var(--text-primary)", fontSize: "0.9rem", boxSizing: "border-box",
                                        }}
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
                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                            <button onClick={closeEdit} style={{
                                padding: "0.65rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border-color)",
                                background: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.875rem",
                            }}>Cancel</button>
                            <button onClick={saveEdit} style={{
                                padding: "0.65rem 1.5rem", borderRadius: "8px", border: "none",
                                background: "var(--accent-gold)", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem",
                            }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId !== null && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 999,
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <div style={{
                        background: "var(--bg-secondary)", borderRadius: "16px", padding: "2rem",
                        width: 380, textAlign: "center", border: "1px solid var(--border-color)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                    }}>
                        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🗑️</div>
                        <h3 style={{ margin: "0 0 0.5rem" }}>Delete Hotel?</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
                            This will permanently remove <strong style={{ color: "var(--text-primary)" }}>{hotels.find(h => h.id === deleteId)?.name}</strong> from the system. This action cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                            <button onClick={() => setDeleteId(null)} style={{
                                padding: "0.65rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border-color)",
                                background: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.875rem",
                            }}>Cancel</button>
                            <button onClick={confirmDelete} style={{
                                padding: "0.65rem 1.5rem", borderRadius: "8px", border: "none",
                                background: "#ef4444", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem",
                            }}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
