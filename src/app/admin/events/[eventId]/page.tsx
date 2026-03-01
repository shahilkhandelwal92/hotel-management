"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockEvents, mockGuests, CorporateEvent, EventGuest } from "@/lib/mockData";
import styles from "../events.module.css";
import React from "react";

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<CorporateEvent | null>(null);
    const [guests, setGuests] = useState<EventGuest[]>([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Mock data fetch
        const evt = mockEvents.find(e => e.id === params.eventId);
        if (evt) {
            setEvent(evt);
            setGuests(mockGuests.filter(g => g.eventId === evt.id));
        }
    }, [params.eventId]);

    const handleSendUpdates = () => {
        setSending(true);
        setTimeout(() => {
            alert("Updates sent to all pending guests via SMS & Email!");
            setSending(false);
        }, 1500);
    };

    if (!event) return <div className="animate-fade-in p-8 text-center text-secondary">Loading event details...</div>;

    const attendedCount = guests.filter(g => g.status === "Attended").length;

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <div>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        &larr; Back to Events
                    </button>
                    <h1 className="text-2xl font-bold">{event.name}</h1>
                    <p className="text-secondary">{event.corporateName} &bull; {new Date(event.date).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Corporate Access Code</div>
                    <code className={styles.accessCode} style={{ fontSize: '1.2rem', padding: '0.4rem 0.8rem' }}>{event.accessCode}</code>
                </div>
            </div>

            <div className={styles.statCards}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Expected Guests</div>
                    <div className={styles.statValue}>{event.expectedCount}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Imported List</div>
                    <div className={styles.statValue}>{guests.length}</div>
                </div>
                <div className={styles.statCard} style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                    <div className={styles.statLabel}>Checked In (QR)</div>
                    <div className={styles.statValue} style={{ color: '#34d399' }}>{attendedCount}</div>
                </div>
            </div>

            <div className={styles.actionToolbar}>
                <button
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    onClick={handleSendUpdates}
                    disabled={sending}
                >
                    {sending ? "Sending..." : "📤 Send SMS/Email Invites"}
                </button>
                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    ⬇️ Download Report
                </button>
            </div>

            <h2 className="text-xl font-bold mb-4 mt-8">Guest List</h2>
            <div className={styles.tableContainer}>
                <table className={styles.eventsTable}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {guests.map((guest) => (
                            <tr key={guest.id}>
                                <td style={{ fontWeight: 500 }}>{guest.name}</td>
                                <td>{guest.mobile}</td>
                                <td>{guest.email}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${guest.status === 'Attended' ? styles.statusAttended : styles.statusPending}`}>
                                        {guest.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
