"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

interface HotelDetail {
    id: string;
    name: string;
    location: string;
    roomCount: number;
    status: string;
    gstin?: string;
    pan?: string;
    category?: string;
    checkInTime?: string;
    checkOutTime?: string;
    _count?: { users: number; rooms: number; events: number };
    users?: { id: string; name: string; role: string }[];
}

export default function HotelDetailPage() {
    const { id } = useParams() as { id: string };
    const [hotel, setHotel] = useState<HotelDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/hotels/${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.hotel) setHotel(d.hotel);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading property details...
        </div>
    );

    if (!hotel) return (
        <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>🏨</div>
            <h2>Hotel not found</h2>
            <Link href="/admin/dashboard" style={{ color: "var(--accent-gold)" }}>← Back to Dashboard</Link>
        </div>
    );

    return (
        <div style={{ padding: "2rem", maxWidth: 1100 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                <div>
                    <Link href="/admin/dashboard" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textDecoration: "none" }}>← Dashboard</Link>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.3rem 0 0.2rem" }}>{hotel.name}</h1>
                    <p style={{ margin: 0, color: "var(--text-secondary)" }}>{hotel.location} · {hotel.category} · GSTIN: {hotel.gstin}</p>
                </div>
                <span style={{ padding: "0.4rem 1rem", borderRadius: "20px", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 700, fontSize: "0.85rem" }}>● {hotel.status}</span>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                {[
                    { label: "Total Rooms", value: hotel.roomCount, icon: "🛏️" },
                    { label: "Occupancy Rate", value: "84%", icon: "📊" },
                    { label: "Monthly Revenue", value: "₹1.23 Cr", icon: "💰" },
                    { label: "Staff Count", value: hotel._count?.users ?? 0, icon: "👥" },
                ].map((s, i) => (
                    <div key={i} style={{ padding: "1.2rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>{s.label}</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-gold)" }}>{s.value}</div>
                        </div>
                        <span style={{ fontSize: "1.8rem", opacity: 0.5 }}>{s.icon}</span>
                    </div>
                ))}
            </div>

            {/* Info + Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Property Details</h3>
                    {[
                        { label: "Category", value: hotel.category || "-" },
                        { label: "PAN", value: hotel.pan || "-" },
                        { label: "GSTIN", value: hotel.gstin || "-" },
                        { label: "Check-in", value: hotel.checkInTime || "-" },
                        { label: "Check-out", value: hotel.checkOutTime || "-" },
                    ].map(r => (
                        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{r.label}</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{r.value}</span>
                        </div>
                    ))}
                </div>

                <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Quick Actions</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {[
                            { label: "📊 View GST Report", path: "/admin/reports/gst" },
                            { label: "💰 View Financial Report", path: "/admin/reports/financial" },
                            { label: "👥 Manage Staff", path: "/admin/users" },
                            { label: "🕐 View Attendance", path: "/admin/hr/attendance" },
                            { label: "⚙️ Property Settings", path: "/admin/settings" },
                        ].map(a => (
                            <Link key={a.path} href={a.path} style={{
                                padding: "0.65rem 1rem", borderRadius: "8px",
                                border: "1px solid var(--border-color)", background: "var(--bg-primary)",
                                color: "var(--text-primary)", textDecoration: "none", fontSize: "0.85rem",
                                display: "block", transition: "border-color 0.15s",
                            }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-gold)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"}
                            >{a.label}</Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Staff Overview</h3>
                    <Link href="/admin/users" style={{ fontSize: "0.85rem", color: "var(--accent-gold)", textDecoration: "none" }}>Manage All Staff →</Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    {hotel.users && hotel.users.length > 0 ? hotel.users.map((s, i) => (
                        <div key={i} style={{ padding: "1rem", background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{s.role}</div>
                                </div>
                                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 600, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>Active</span>
                            </div>
                        </div>
                    )) : (
                        <div style={{ gridColumn: "1 / -1", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "10px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            No staff members assigned to this property yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Recent Activity</h3>
            <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)", borderStyle: "dashed", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Activity logs and bookings will appear here as they are processed in real-time.
            </div>
        </div>
    );
}
