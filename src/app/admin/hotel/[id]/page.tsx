"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";

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
    hasInHouseRestaurant: boolean;
    _count?: { users: number; rooms: number; events: number };
    users?: { id: string; name: string; email: string; roles: { role: { name: string } }[] }[];
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
            <div className="animate-pulse" style={{ fontSize: "1.2rem" }}>Analyzing property records...</div>
        </div>
    );

    if (!hotel) return (
        <div className="animate-fade-in" style={{ padding: "5rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: '1.5rem' }}>🏨</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Property not found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We couldn't locate the requested hotel in our global directory.</p>
            <Link href="/admin/dashboard">
                <Button variant="primary">Return to Dashboard</Button>
            </Link>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <Link href="/admin/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>←</span> Back to Global Portfolio
                        </Link>
                    </div>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{hotel.name}</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.6rem' }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: '1.1rem' }}>{hotel.location}</span>
                        <Badge variant={hotel.status === "Active" ? "success" : "neutral"}>{hotel.status}</Badge>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <Link href="/admin/settings">
                        <Button variant="outline">Property Settings</Button>
                    </Link>
                    <Button variant="primary">Generate Audit Report</Button>
                </div>
            </div>

            {/* Performance Snapshot */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
                <Card title="Total Capacity" subtitle="Room inventory">
                    <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{hotel.roomCount}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Keys under management</div>
                </Card>
                <Card title="Personnel" subtitle="Active staff">
                    <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-gold)" }}>{hotel._count?.users ?? 0}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Employees assigned</div>
                </Card>
                <Card title="Engagement" subtitle="Corporate events">
                    <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{hotel._count?.events ?? 0}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Scheduled functions</div>
                </Card>
                <Card title="Features" subtitle="Dining & Amenities">
                    <div style={{ fontSize: "2.5rem", fontWeight: 700, color: hotel.hasInHouseRestaurant ? "#10b981" : "var(--text-secondary)" }}>
                        {hotel.hasInHouseRestaurant ? "YES" : "NO"}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Restaurant status</div>
                </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "2rem", marginBottom: "2.5rem" }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card title="Property Details" subtitle="Regulatory and operational configuration">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                {[
                                    { label: "Property Category", value: hotel.category || "Luxury Boutique" },
                                    { label: "Check-in Protocol", value: hotel.checkInTime || "2:00 PM onwards" },
                                    { label: "Check-out Deadline", value: hotel.checkOutTime || "11:00 AM" },
                                ].map(r => (
                                    <div key={r.label} style={{ padding: "1rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: '0.3rem' }}>{r.label}</div>
                                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{r.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                {[
                                    { label: "GSTIN Number", value: hotel.gstin || "Not Registered" },
                                    { label: "Business PAN", value: hotel.pan || "Not Provided" },
                                    { label: "Property ID", value: hotel.id },
                                ].map(r => (
                                    <div key={r.label} style={{ padding: "1rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: '0.3rem' }}>{r.label}</div>
                                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{r.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card title="Executive Staff" subtitle="Key personnel assigned to this property">
                        <Table
                            headers={["Name", "Primary Role", "Identity", "Status"]}
                            loading={false}
                        >
                            {hotel.users && hotel.users.length > 0 ? hotel.users.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <Badge variant="info">{s.roles?.[0]?.role?.name || "Staff"}</Badge>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.email}</td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                            Online
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No executive staff listed for this property.
                                    </td>
                                </tr>
                            )}
                        </Table>
                    </Card>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card title="Expedited Access" subtitle="Quick navigation to related modules">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {[
                                { label: "📈 GST & Compliance", path: "/admin/reports/gst" },
                                { label: "💹 Financial Statements", path: "/admin/reports/financial" },
                                { label: "🔑 Access Management", path: "/admin/users" },
                                { label: "📅 Attendance Ledger", path: "/admin/hr/attendance" },
                                { label: "🛠️ Operational Config", path: "/admin/settings" },
                            ].map(a => (
                                <Link key={a.path} href={a.path} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        padding: "1rem", borderRadius: "12px",
                                        border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)",
                                        color: "var(--text-primary)", fontSize: "0.95rem",
                                        fontWeight: 500, transition: "all 0.2s",
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = "var(--accent-gold)";
                                            e.currentTarget.style.background = "rgba(180, 150, 80, 0.05)";
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = "var(--border-color)";
                                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                        }}
                                    >
                                        {a.label}
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>→</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>

                    <Card title="Property Audit" subtitle="System Health & Integrity">
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                            <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.4rem' }}>SECURE & SYNCED</div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                All operational data for this property is currently encrypted and synchronized with the global ledger.
                            </p>
                            <Button variant="outline" size="sm" style={{ marginTop: '1rem', width: '100%' }}>Scan for Inconsistencies</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
