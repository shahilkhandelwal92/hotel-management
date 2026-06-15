"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    LogOut,
    RefreshCw,
    TicketCheck,
    UsersRound,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import styles from "./dashboard.module.css";

type EventSummary = {
    id: string;
    name: string;
    corporateName: string;
    date: string;
    expectedCount: number;
    accessCode: string;
    hotel: { name: string };
    _count: { guests: number };
};

type EventGuest = {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    status: string;
    attendanceTime: string | null;
};

type EventDetail = EventSummary & {
    guests: EventGuest[];
    hotel: { name: string; location: string };
};

export default function CorporateWorkspacePage() {
    const router = useRouter();
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [detail, setDetail] = useState<EventDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadEvents = useCallback(async () => {
        setError("");
        const response = await fetch("/api/events");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load corporate events");
        const nextEvents = data.events || [];
        setEvents(nextEvents);
        setSelectedId((current) => current || nextEvents[0]?.id || "");
    }, []);

    const loadDetail = useCallback(async (eventId: string) => {
        if (!eventId) {
            setDetail(null);
            return;
        }
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load event attendance");
        setDetail(data.event);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                await loadEvents();
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Could not load events");
            } finally {
                setLoading(false);
            }
        };
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [loadEvents]);

    useEffect(() => {
        if (!selectedId) return;
        const timer = window.setTimeout(() => {
            void loadDetail(selectedId).catch((loadError) => {
                setError(loadError instanceof Error ? loadError.message : "Could not load attendance");
            });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadDetail, selectedId]);

    const attended = useMemo(
        () => detail?.guests.filter((guest) => guest.status === "Attended").length ?? 0,
        [detail],
    );
    const attendanceRate = detail?.expectedCount
        ? Math.round((attended / detail.expectedCount) * 100)
        : 0;

    const refresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadEvents(), loadDetail(selectedId)]);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not refresh events");
        } finally {
            setRefreshing(false);
        }
    };

    const signOut = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
    };

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div className={styles.brand}><span><Building2 size={20} /></span> StayOS Partners</div>
                <div className={styles.headerActions}>
                    <Button variant="outline" size="sm" onClick={() => void refresh()} loading={refreshing}>
                        <RefreshCw size={15} /> Refresh
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                        <LogOut size={15} /> Sign out
                    </Button>
                </div>
            </header>

            <section className={styles.hero}>
                <div>
                    <div className={styles.eyebrow}>Corporate event intelligence</div>
                    <h1>Your events, live and organized.</h1>
                    <p>Track delegate arrivals, event capacity, and venue context from one secure partner workspace.</p>
                </div>
                {events.length > 0 && (
                    <label className={styles.eventPicker}>
                        <span>Viewing event</span>
                        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                            {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                        </select>
                    </label>
                )}
            </section>

            {error && <div className={styles.error} role="alert">{error}</div>}

            {loading ? (
                <div className={styles.loading}>Loading your partner workspace...</div>
            ) : !detail ? (
                <section className={styles.empty}>
                    <CalendarDays size={34} />
                    <h2>No events assigned yet</h2>
                    <p>Your hotel coordinator can create the event and share its attendee access code.</p>
                </section>
            ) : (
                <>
                    <section className={styles.eventHeader}>
                        <div>
                            <Badge variant="success">Live workspace</Badge>
                            <h2>{detail.name}</h2>
                            <p>{detail.corporateName} · {detail.hotel.name}, {detail.hotel.location}</p>
                        </div>
                        <div className={styles.eventMeta}>
                            <span><CalendarDays size={16} /> {new Date(detail.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span><TicketCheck size={16} /> Attendee code: <strong>{detail.accessCode}</strong></span>
                        </div>
                    </section>

                    <section className={styles.metrics}>
                        <article><span><UsersRound size={20} /></span><div><small>Expected</small><strong>{detail.expectedCount}</strong></div></article>
                        <article><span className={styles.mint}><CheckCircle2 size={20} /></span><div><small>Checked in</small><strong>{attended}</strong></div></article>
                        <article><span className={styles.coral}><Clock3 size={20} /></span><div><small>Pending arrival</small><strong>{Math.max(detail.expectedCount - attended, 0)}</strong></div></article>
                        <article><span className={styles.violet}><TicketCheck size={20} /></span><div><small>Attendance rate</small><strong>{attendanceRate}%</strong></div></article>
                    </section>

                    <section className={styles.attendance}>
                        <div className={styles.sectionTitle}>
                            <div><h2>Delegate attendance</h2><p>Arrival status updates as passes are scanned.</p></div>
                            <span>{detail.guests.length} registered</span>
                        </div>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead><tr><th>Delegate</th><th>Contact</th><th>Status</th><th>Arrival</th></tr></thead>
                                <tbody>
                                    {detail.guests.length === 0 ? (
                                        <tr><td colSpan={4} className={styles.tableEmpty}>No delegates have been uploaded for this event.</td></tr>
                                    ) : detail.guests.map((guest) => (
                                        <tr key={guest.id}>
                                            <td><strong>{guest.name}</strong><small>{guest.email || "Email not provided"}</small></td>
                                            <td>{guest.mobile}</td>
                                            <td><Badge variant={guest.status === "Attended" ? "success" : "warning"}>{guest.status}</Badge></td>
                                            <td>{guest.attendanceTime ? new Date(guest.attendanceTime).toLocaleString("en-IN") : "Awaiting arrival"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}
