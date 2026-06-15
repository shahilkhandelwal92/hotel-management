"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

interface LeaveType {
    id: string;
    name: string;
    defaultDays: number;
}

export default function HRLeaveSettingsPage() {
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<any[]>([]);

    // Form state
    const [newType, setNewType] = useState("");
    const [newDays, setNewDays] = useState(12);

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) {
                setHotels(d.hotels);
                setHotelId(d.hotels[0].id);
            }
        });
    }, []);

    const fetchLeaveTypes = async () => {
        if (!hotelId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/settings?hotelId=${hotelId}`);
            const data = await res.json();
            setLeaveTypes(data.leaveTypes || []);
        } catch (err) {
            console.error("Fetch leave types error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeaveTypes(); }, [hotelId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newType || newDays <= 0 || !hotelId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/hr/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newType, defaultDays: newDays, hotelId })
            });
            if (res.ok) {
                setNewType("");
                setNewDays(12);
                fetchLeaveTypes();
            }
        } catch (err) {
            console.error("Add leave type error:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this leave policy?")) return;
        try {
            const res = await fetch(`/api/hr/settings/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                fetchLeaveTypes();
            } else {
                alert(data.error || "Failed to delete policy");
            }
        } catch (err) {
            console.error("Delete leave type error:", err);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>HR Policies</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Configure default annual leave allowances and employment rules.
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                <Card title="Current Leave Policies" subtitle="Default allowances for this property">
                    <Table
                        headers={["Leave Type", "Annual Allowance", "Actions"]}
                        loading={loading}
                    >
                        {leaveTypes.map((lt) => (
                            <tr key={lt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{lt.name}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>{lt.defaultDays} Days / Year</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleDelete(lt.id)}
                                    >
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>

                <Card title="New Category" subtitle="Define a new leave type">
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <Input
                            label="Policy Name"
                            value={newType}
                            onChange={e => setNewType(e.target.value)}
                            placeholder="e.g. Marriage Leave"
                        />
                        <Input
                            label="Default Days"
                            type="number"
                            value={newDays.toString()}
                            onChange={e => setNewDays(parseInt(e.target.value))}
                            min="1"
                        />
                        <Button variant="primary" type="submit" loading={saving} style={{ width: '100%' }}>
                            Save Policy
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
