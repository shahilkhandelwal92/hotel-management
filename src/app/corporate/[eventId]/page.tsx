"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockEvents, mockGuests, CorporateEvent, EventGuest } from "@/lib/mockData";
import styles from "../corporate.module.css";
import React from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CorporateDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<CorporateEvent | null>(null);
    const [attendedGuests, setAttendedGuests] = useState<EventGuest[]>([]);

    useEffect(() => {
        // Mock data fetch
        const evt = mockEvents.find(e => e.id === params.eventId);
        if (evt) {
            setEvent(evt);
            // Corporate only sees attended guests typically
            setAttendedGuests(mockGuests.filter(g => g.eventId === evt.id && g.status === "Attended"));
        } else {
            router.push("/corporate");
        }
    }, [params.eventId, router]);

    if (!event) return <div className="animate-fade-in p-8 text-center" style={{ color: '#fff' }}>Loading dashboard...</div>;

    const attendancePercentage = Math.round((attendedGuests.length / event.expectedCount) * 100) || 0;

    return (
        <div className={styles.container}>
            <div className={styles.dashboardContainer}>

                <div className={styles.dashboardHeader}>
                    <div>
                        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{event.name}</h1>
                        <p style={{ color: 'var(--accent-gold)' }}>Dashboard for {event.corporateName}</p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <ThemeToggle />
                        <div>
                            <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Event Date</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Expected</div>
                        <div className={styles.statValue} style={{ color: 'var(--text-primary)', WebkitTextFillColor: 'var(--text-primary)' }}>{event.expectedCount}</div>
                    </div>
                    <div className={styles.statCard} style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                        <div className={styles.statLabel}>Checked In</div>
                        <div className={styles.statValue} style={{ color: '#34d399', WebkitTextFillColor: '#34d399' }}>{attendedGuests.length}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Turnout</div>
                        <div className={styles.statValue} style={{ color: 'var(--accent-gold)', WebkitTextFillColor: 'var(--accent-gold)' }}>{attendancePercentage}%</div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem' }}>
                            <div style={{ width: `${attendancePercentage}%`, background: 'var(--accent-gold)', height: '100%', transition: 'width 1s' }}></div>
                        </div>
                    </div>
                </div>

                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '1rem' }}>Live Attendance Feed</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.DataTable}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Check-in Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendedGuests.map((guest) => (
                                <tr key={guest.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{guest.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>Just Now</td>
                                    <td>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            Present
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {attendedGuests.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "center", padding: "2rem", color: 'var(--text-secondary)' }}>
                                        No guests have checked in yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
