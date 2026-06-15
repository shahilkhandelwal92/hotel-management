"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import styles from "./events.module.css";

interface Event {
    id: string;
    name: string;
    corporateName: string;
    date: string;
    expectedCount: number;
    accessCode: string;
    _count?: { guests: number };
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
    const [form, setForm] = useState({
        name: "",
        corporateName: "",
        date: "",
        expectedCount: ""
    });

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/events");
            const data = await res.json();
            setEvents(data.events ?? []);
        } catch (err) {
            console.error("Fetch events error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editEvent ? `/api/events/${editEvent.id}` : "/api/events";
        const method = editEvent ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setShowModal(false);
                setEditEvent(null);
                setForm({ name: "", corporateName: "", date: "", expectedCount: "" });
                fetchEvents();
            }
        } catch (err) {
            console.error("Action error:", err);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/events/${deleteId}`, { method: "DELETE" });
            if (res.ok) {
                setDeleteId(null);
                setEvents(prev => prev.filter(e => e.id !== deleteId));
            }
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (e: Event) => {
        setEditEvent(e);
        setForm({
            name: e.name,
            corporateName: e.corporateName,
            date: e.date.split('T')[0], // Extract YYYY-MM-DD
            expectedCount: String(e.expectedCount)
        });
        setShowModal(true);
    };

    const downloadReport = () => {
        const headers = ["Event Name", "Corporate", "Date", "expected Count", "Access Code"];
        const rows = events.map(e => [e.name, e.corporateName, new Date(e.date).toLocaleDateString(), e.expectedCount, e.accessCode]);
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `events_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Corporate Events</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Manage high-profile corporate bookings, guest lists, and event-specific access.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <Button variant="outline" size="sm" onClick={downloadReport}>Export Report</Button>
                    <Button variant="primary" size="sm" onClick={() => { setEditEvent(null); setForm({ name: "", corporateName: "", date: "", expectedCount: "" }); setShowModal(true); }}>+ Create Event</Button>
                </div>
            </div>

            <Card title="Active Bookings" subtitle="Overview of all scheduled events">
                <Table
                    headers={["Event Name", "Corporate / Company", "Date", "Guests", "Access Code", "Actions"]}
                    loading={loading}
                >
                    {events.map(evt => (
                        <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{evt.name}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>{evt.corporateName}</td>
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{new Date(evt.date).toLocaleDateString("en-IN")}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant="info">{evt._count?.guests ?? evt.expectedCount} guests</Badge>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '1px', color: 'var(--accent-gold)' }}>{evt.accessCode}</code>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Link href={`/admin/events/${evt.id}`} passHref>
                                        <Button size="sm" variant="ghost">Manage</Button>
                                    </Link>
                                    <Button size="sm" variant="secondary" onClick={() => openEdit(evt)}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => setDeleteId(evt.id)}>Delete</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editEvent ? "Update Event Details" : "Configure New Event"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSubmit} loading={saving}>{editEvent ? "Save Changes" : "Create Event"}</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input label="Event Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Tech Summit" />
                    <Input label="Corporate/Company" value={form.corporateName} onChange={e => setForm({ ...form, corporateName: e.target.value })} placeholder="e.g. Acme Corp" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input label="Event Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        <Input label="Expected Guests" type="number" value={form.expectedCount} onChange={e => setForm({ ...form, expectedCount: e.target.value })} placeholder="150" />
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Cancel Event"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Keep Event</Button>
                        <Button variant="danger" onClick={confirmDelete} loading={saving}>Deactivate Event</Button>
                    </>
                }
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to cancel this event? All associated guests and orders will be persistently removed. Access codes will be invalidated.</p>
                </div>
            </Modal>
        </div>
    );
}
