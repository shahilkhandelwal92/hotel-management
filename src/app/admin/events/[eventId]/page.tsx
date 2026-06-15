"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import styles from "../events.module.css";

interface CorporateEvent {
    id: string;
    name: string;
    corporateName: string;
    date: string;
    expectedCount: number;
    accessCode: string;
}

interface EventGuest {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    status: string;
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<CorporateEvent | null>(null);
    const [guests, setGuests] = useState<EventGuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Modals
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [editGuest, setEditGuest] = useState<EventGuest | null>(null);
    const [deleteGuest, setDeleteGuest] = useState<EventGuest | null>(null);

    // Form State
    const [guestForm, setGuestForm] = useState({ name: "", mobile: "", email: "" });

    const fetchEventData = useCallback(async () => {
        if (!params.eventId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${params.eventId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch event");
            setEvent(data.event);
            setGuests(data.event.guests || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [params.eventId]);

    useEffect(() => { fetchEventData(); }, [fetchEventData]);

    const handleGuestAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editGuest ? `/api/guests/${editGuest.id}` : "/api/guests";
        const method = editGuest ? "PUT" : "POST";
        const body = editGuest ? guestForm : { ...guestForm, eventId: params.eventId };

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setShowGuestModal(false);
                setEditGuest(null);
                setGuestForm({ name: "", mobile: "", email: "" });
                fetchEventData();
            }
        } catch (err) {
            console.error("Guest action error:", err);
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteGuest = async () => {
        if (!deleteGuest) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/guests/${deleteGuest.id}`, { method: "DELETE" });
            if (res.ok) {
                setDeleteGuest(null);
                fetchEventData();
            }
        } catch (err) {
            console.error("Delete guest error:", err);
        } finally {
            setSaving(false);
        }
    };

    const openEditGuest = (g: EventGuest) => {
        setEditGuest(g);
        setGuestForm({ name: g.name, mobile: g.mobile, email: g.email || "" });
        setShowGuestModal(true);
    };

    if (error) return (
        <Card title="Error" subtitle="Could not load event data">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <Button onClick={() => router.push("/admin/events")}>Back to Events</Button>
        </Card>
    );

    const attendedCount = guests.filter(g => g.status === "Attended").length;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/admin/events")} style={{ padding: 0, marginBottom: '0.5rem' }}>&larr; Back to Events</Button>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>{event?.name}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        {event?.corporateName} &bull; {event && new Date(event.date).toLocaleDateString()}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Event Access Code</div>
                    <Badge variant="warning" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', letterSpacing: '2px', fontFamily: 'monospace' }}>
                        {event?.accessCode}
                    </Badge>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card title="Expected" subtitle="Guest commitment">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{event?.expectedCount}</div>
                </Card>
                <Card title="Registered" subtitle="In guest list">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{guests.length}</div>
                </Card>
                <Card title="Attended" subtitle="QR Checked-in">
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>{attendedCount}</div>
                </Card>
            </div>

            <Card title="Guest List" subtitle="Manage individual guest registrations" headerAction={
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <Button variant="outline" size="sm" onClick={() => alert("Simulating SMS Invitations...")}>Send Invites</Button>
                    <Button variant="primary" size="sm" onClick={() => { setEditGuest(null); setGuestForm({ name: "", mobile: "", email: "" }); setShowGuestModal(true); }}>+ Add Guest</Button>
                </div>
            }>
                <Table
                    headers={["Guest Name", "Contact Details", "Status", "Actions"]}
                    loading={loading}
                >
                    {guests.map(g => (
                        <tr key={g.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{g.name}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ fontSize: '0.9rem' }}>{g.mobile}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{g.email || "-"}</div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant={g.status === "Attended" ? "success" : "neutral"}>{g.status}</Badge>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Button size="sm" variant="secondary" onClick={() => openEditGuest(g)}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => setDeleteGuest(g)}>Remove</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Guest Modal */}
            <Modal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                title={editGuest ? "Update Guest Information" : "Add Guest to Event"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowGuestModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleGuestAction} loading={saving}>{editGuest ? "Save Changes" : "Register Guest"}</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input label="Guest Name" value={guestForm.name} onChange={e => setGuestForm({ ...guestForm, name: e.target.value })} placeholder="John Smith" />
                    <Input label="Mobile Number" value={guestForm.mobile} onChange={e => setGuestForm({ ...guestForm, mobile: e.target.value })} placeholder="+91 9876543210" />
                    <Input label="Email Address (Optional)" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} placeholder="john@example.com" />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteGuest}
                onClose={() => setDeleteGuest(null)}
                title="Remove Guest"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteGuest(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDeleteGuest} loading={saving}>Confirm Removal</Button>
                    </>
                }
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Remove <strong style={{ color: '#fff' }}>{deleteGuest?.name}</strong> from this event? All associated activity will be lost.</p>
                </div>
            </Modal>
        </div>
    );
}
