"use client";

import Link from "next/link";
import { mockEvents } from "@/lib/mockData";
import styles from "./events.module.css";
import React from "react";

export default function AdminEventsPage() {
    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <div>
                    <h1 className="text-2xl font-bold">Corporate Events</h1>
                    <p className="text-secondary">Manage corporate bookings and guest lists</p>
                </div>
                <Link href="/admin/events/create" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
                    + Create Event
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.eventsTable}>
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Corporate/Company</th>
                            <th>Date</th>
                            <th>Expected Guests</th>
                            <th>Access Code</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockEvents.map((evt) => (
                            <tr key={evt.id}>
                                <td style={{ fontWeight: 500, color: 'var(--accent-gold)' }}>{evt.name}</td>
                                <td>{evt.corporateName}</td>
                                <td>{new Date(evt.date).toLocaleDateString()}</td>
                                <td>{evt.expectedCount}</td>
                                <td><code className={styles.accessCode}>{evt.accessCode}</code></td>
                                <td>
                                    <Link href={`/admin/events/${evt.id}`} className={styles.actionBtn}>
                                        Manage &rarr;
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {mockEvents.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                                    No events found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
