"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

export default function HRAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<any[]>([]);

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) {
                setHotels(d.hotels);
                setHotelId(d.hotels[0].id);
            }
        });
    }, []);

    useEffect(() => {
        if (!hotelId) return;
        setLoading(true);
        fetch(`/api/attendance?hotelId=${hotelId}`)
            .then(r => r.json())
            .then(d => {
                setRecords(d.records || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Attendance fetch error:", err);
                setLoading(false);
            });
    }, [hotelId]);

    const exportCSV = () => {
        const hotel = hotels.find(h => h.id === hotelId);
        const rows = [["Staff", "Role", "Punch In", "Punch Out", "Status"], ...records.map(r => [r.name, r.role, r.checkIn, r.checkOut, r.status])];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `attendance_${hotel?.name || 'hotel'}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const presentCount = records.filter(r => r.status === "Present").length;
    const absentCount = records.filter(r => r.status === "Absent").length;
    const halfDayCount = records.filter(r => r.status === "Half-Day").length;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Daily Attendance</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Live overview of staff presence for <strong style={{ color: 'var(--text-primary)' }}>{today}</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    {hotels.length > 1 && (
                        <select
                            value={hotelId}
                            onChange={e => setHotelId(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.8rem', borderRadius: '8px' }}
                        >
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="outline" size="sm" onClick={exportCSV}>Download Attendance Log</Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card title="Present" subtitle="Currently on duty">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>{presentCount}</div>
                </Card>
                <Card title="Absent" subtitle="Not punched in">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ef4444' }}>{absentCount}</div>
                </Card>
                <Card title="Half-Day" subtitle="Short shifts">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{halfDayCount}</div>
                </Card>
            </div>

            <Card title="Live Punch Feed" subtitle="Real-time employee activity stream">
                <Table
                    headers={["Staff Member", "Department / Role", "Punch In", "Punch Out", "Status"]}
                    loading={loading}
                >
                    {records.map(record => (
                        <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{record.name}</td>
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{record.role}</td>
                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>{record.checkIn}</td>
                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>{record.checkOut}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant={
                                    record.status === "Present" ? "success" :
                                        record.status === "Absent" ? "danger" : "warning"
                                }>
                                    {record.status}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
}
