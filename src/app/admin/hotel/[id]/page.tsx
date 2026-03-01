"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const hotelData: Record<string, {
    name: string; location: string; rooms: number; status: string;
    gstin: string; pan: string; category: string; checkIn: string; checkOut: string;
    occupancy: number; revenue: string; staff: { name: string; role: string; status: string }[];
    recentBookings: { guest: string; room: string; checkIn: string; checkOut: string; amount: string; status: string }[];
}> = {
    "1": {
        name: "The Grand Imperial", location: "Mumbai, Maharashtra", rooms: 120,
        status: "Active", gstin: "27AABCT1234C1Z5", pan: "AABCT1234C",
        category: "5-Star", checkIn: "14:00", checkOut: "12:00",
        occupancy: 84, revenue: "₹1.23 Cr",
        staff: [
            { name: "Raj Kumar", role: "Front Desk Manager", status: "On Duty" },
            { name: "Priya Sharma", role: "Housekeeping Head", status: "On Duty" },
            { name: "Amit Verma", role: "F&B Manager", status: "On Duty" },
            { name: "Neha Patel", role: "Concierge", status: "Off Duty" },
        ],
        recentBookings: [
            { guest: "Anand Shah", room: "Suite 401", checkIn: "2026-03-01", checkOut: "2026-03-05", amount: "₹34,000", status: "Checked In" },
            { guest: "Meera Joshi", room: "Deluxe 302", checkIn: "2026-03-02", checkOut: "2026-03-04", amount: "₹17,000", status: "Confirmed" },
            { guest: "Rohit Gupta", room: "Superior 201", checkIn: "2026-03-03", checkOut: "2026-03-06", amount: "₹25,500", status: "Confirmed" },
        ]
    },
    "2": {
        name: "Royal Orchid", location: "New Delhi, Delhi", rooms: 85,
        status: "Active", gstin: "07AABCR5678D1Z2", pan: "AABCR5678D",
        category: "4-Star", checkIn: "14:00", checkOut: "11:00",
        occupancy: 71, revenue: "₹74.2L",
        staff: [
            { name: "Sunita Mehta", role: "General Manager", status: "On Duty" },
            { name: "Kiran Rao", role: "Front Desk", status: "On Duty" },
            { name: "Vikram Singh", role: "Security Head", status: "On Duty" },
        ],
        recentBookings: [
            { guest: "Deepak Nair", room: "Room 204", checkIn: "2026-03-01", checkOut: "2026-03-03", amount: "₹9,000", status: "Checked In" },
            { guest: "Pooja Iyer", room: "Room 310", checkIn: "2026-03-02", checkOut: "2026-03-05", amount: "₹13,500", status: "Confirmed" },
        ]
    },
    "3": {
        name: "Sunset Resort & Spa", location: "Panaji, Goa", rooms: 45,
        status: "Active", gstin: "30AABCS9012E1Z9", pan: "AABCS9012E",
        category: "3-Star", checkIn: "13:00", checkOut: "11:00",
        occupancy: 92, revenue: "₹38.6L",
        staff: [
            { name: "Carlos D'Souza", role: "Resort Manager", status: "On Duty" },
            { name: "Lakshmi Nair", role: "Spa Director", status: "On Duty" },
        ],
        recentBookings: [
            { guest: "Arjun Menon", room: "Cottage 7", checkIn: "2026-03-01", checkOut: "2026-03-07", amount: "₹39,000", status: "Checked In" },
        ]
    },
};

export default function HotelDetailPage() {
    const { id } = useParams() as { id: string };
    const hotel = hotelData[id];

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
                    { label: "Total Rooms", value: hotel.rooms, icon: "🛏️" },
                    { label: "Occupancy Rate", value: `${hotel.occupancy}%`, icon: "📊" },
                    { label: "Monthly Revenue", value: hotel.revenue, icon: "💰" },
                    { label: "Staff Count", value: hotel.staff.length, icon: "👥" },
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
                        { label: "Category", value: hotel.category },
                        { label: "PAN", value: hotel.pan },
                        { label: "GSTIN", value: hotel.gstin },
                        { label: "Check-in", value: hotel.checkIn },
                        { label: "Check-out", value: hotel.checkOut },
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
                <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Staff on Duty</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    {hotel.staff.map((s, i) => (
                        <div key={i} style={{ padding: "1rem", background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{s.role}</div>
                                </div>
                                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 600, background: s.status === "On Duty" ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)", color: s.status === "On Duty" ? "#10b981" : "#94a3b8" }}>{s.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Bookings */}
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Recent Bookings</h3>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-secondary)" }}>
                            {["Guest", "Room", "Check-in", "Check-out", "Amount", "Status"].map(h => (
                                <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {hotel.recentBookings.map((b, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "0.8rem 1rem", fontWeight: 600 }}>{b.guest}</td>
                                <td style={{ padding: "0.8rem 1rem", color: "var(--text-secondary)" }}>{b.room}</td>
                                <td style={{ padding: "0.8rem 1rem" }}>{b.checkIn}</td>
                                <td style={{ padding: "0.8rem 1rem" }}>{b.checkOut}</td>
                                <td style={{ padding: "0.8rem 1rem", fontWeight: 700, color: "var(--accent-gold)" }}>{b.amount}</td>
                                <td style={{ padding: "0.8rem 1rem" }}>
                                    <span style={{ padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600, background: b.status === "Checked In" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", color: b.status === "Checked In" ? "#3b82f6" : "#10b981" }}>{b.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
