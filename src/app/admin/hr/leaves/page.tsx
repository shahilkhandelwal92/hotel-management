"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface LeaveRequest {
    id: string;
    employeeName: string;
    role: string;
    leaveType: string;
    dates: string;
    reason: string;
    status: string;
}

export default function HRLeaveApprovalsPage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<any[]>([]);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) {
                setHotels(d.hotels);
                setHotelId(d.hotels[0].id);
            }
        });
    }, []);

    const fetchLeaves = async () => {
        if (!hotelId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/leaves?hotelId=${hotelId}`);
            const data = await res.json();
            const formatted = (data.requests || []).map((r: any) => ({
                id: r.id,
                employeeName: r.user.name,
                role: "Staff", // Role info not directly in leave request, could be joined if needed
                leaveType: r.leaveType.name,
                dates: `${new Date(r.startDate).toLocaleDateString("en-IN")} - ${new Date(r.endDate).toLocaleDateString("en-IN")}`,
                reason: r.reason,
                status: r.status
            }));
            setRequests(formatted);
        } catch (err) {
            console.error("Fetch leaves error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeaves(); }, [hotelId]);

    const handleAction = async (id: string, newStatus: string) => {
        setSaving(id);
        try {
            const res = await fetch("/api/leaves", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (res.ok) {
                fetchLeaves();
            }
        } catch (err) {
            console.error("Update leave error:", err);
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Leave Management</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Review, approve, or decline staff leave applications.
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
                </div>
            </div>

            <Card title="Leave Requests" subtitle="Actionable applications waiting for review">
                <Table
                    headers={["Employee", "Leave Type", "Duration", "Reason", "Status", "Actions"]}
                    loading={loading}
                >
                    {requests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ fontWeight: 600 }}>{req.employeeName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.role}</div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>{req.leaveType}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>{req.dates}</td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.reason}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant={
                                    req.status === 'Approved' ? 'success' :
                                        req.status === 'Rejected' ? 'danger' : 'warning'
                                }>
                                    {req.status}
                                </Badge>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                {req.status === 'Pending' ? (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleAction(req.id, 'Approved')}
                                            loading={saving === req.id}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleAction(req.id, 'Rejected')}
                                            loading={saving === req.id}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Processed</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
}
