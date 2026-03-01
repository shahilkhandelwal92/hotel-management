"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./events.module.css";

interface Event {
    id: string;
    name: string;
    corporateName: string;
    date: string;
    expectedCount: number;
    accessCode: string;
    _count?: { guests: number };
    hotel?: { name: string };
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/events")
            .then(r => r.json())
            .then(d => { setEvents(d.events ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const deleteEvent = async (id: string) => {
        if (!confirm("Delete this event and all its guest data?")) return;
        setDeletingId(id);
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (res.ok) setEvents(prev => prev.filter(e => e.id !== id));
        setDeletingId(null);
    };

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <div>
                    <h1 className="text-2xl font-bold">Corporate Events</h1>
                    <p className="text-secondary">Manage corporate bookings and guest lists</p>
                </div>
                <Link href="/admin/events/create" className="btn-primary" style={{ padding: "0.75rem 1.5rem", textDecoration: "none" }}>
                    + Create Event
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.eventsTable}>
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Corporate / Company</th>
                            <th>Date</th>
                            <th>Guests</th>
                            <th>Access Code</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading events from database...</td></tr>
                        )}
                        {!loading && events.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                                No events yet. <Link href="/admin/events/create" style={{ color: "var(--accent-gold)" }}>Create your first event →</Link>
                            </td></tr>
                        )}
                        {events.map(evt => (
                            <tr key={evt.id}>
                                <td style={{ fontWeight: 500, color: "var(--accent-gold)" }}>{evt.name}</td>
                                <td>{evt.corporateName}</td>
                                <td>{new Date(evt.date).toLocaleDateString("en-IN")}</td>
                                <td>
                                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontWeight: 600, fontSize: "0.82rem" }}>
                                        {evt._count?.guests ?? evt.expectedCount} guests
                                    </span>
                                </td>
                                <td><code className={styles.accessCode}>{evt.accessCode}</code></td>
                                <td>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <Link href={`/admin/events/${evt.id}`} className={styles.actionBtn}>Manage →</Link>
                                        <button onClick={() => deleteEvent(evt.id)} disabled={deletingId === evt.id} style={{
                                            padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
                                            background: "rgba(239,68,68,0.1)", color: "#ef4444",
                                            border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
                                        }}>
                                            {deletingId === evt.id ? "..." : "🗑️"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
