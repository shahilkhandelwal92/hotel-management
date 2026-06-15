"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface CorporateEvent {
    id: string;
    name: string;
    corporateName: string;
    date: Date | string;
    expectedCount: number;
    accessCode: string;
}

interface EventGuest {
    id: string;
    name: string;
    status: string;
    attendanceTime: string | null;
}

export default function CorporateDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<CorporateEvent | null>(null);
    const [attendedGuests, setAttendedGuests] = useState<EventGuest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params.eventId) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/corporate/events/${params.eventId}`);
                const data = await res.json();

                if (res.ok) {
                    setEvent(data.event);
                    const guests = (data.event.guests || []).filter((g: any) => g.status === "Attended");
                    setAttendedGuests(guests);
                } else {
                    router.push("/corporate");
                }
            } catch (err) {
                console.error("Failed to fetch corporate data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Refresh every 30 seconds for "Live" feel
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [params.eventId, router]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
            <div className="animate-pulse" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>CONNECTING TO LIVE FEED...</div>
        </div>
    );

    if (!event) return null;

    const attendancePercentage = Math.round((attendedGuests.length / event.expectedCount) * 100) || 0;

    return (
        <div className="animate-fade-in" style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem 1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', maxWidth: '1200px', margin: '0 auto 3rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>{event.name}</h1>
                        <Badge variant="success">LIVE</Badge>
                    </div>
                    <p style={{ color: 'var(--accent-gold)', fontSize: '1.2rem', margin: 0 }}>{event.corporateName} · Event Intelligence</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <ThemeToggle />
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Scheduled Date</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{new Date(event.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Analytics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <Card title="Expected Turnout" subtitle="Registered delegates">
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{event.expectedCount}</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>RSVP count for today</div>
                    </Card>
                    <Card title="Validated Entry" subtitle="Total check-ins">
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{attendedGuests.length}</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Guests currently on-site</div>
                    </Card>
                    <Card title="Engagement Rate" subtitle="Real-time attendance %">
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{attendancePercentage}%</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
                            <div style={{ width: `${attendancePercentage}%`, background: 'var(--accent-gold)', height: '100%', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                    </Card>
                </div>

                {/* Live Feed */}
                <Card title="Live Attendance Feed" subtitle="Real-time check-in log" headerAction={
                    <Button variant="outline" size="sm" onClick={() => window.print()}>Download Manifest</Button>
                }>
                    <Table
                        headers={["Delegate Name", "Check-in Timestamp", "Access Verification"]}
                        loading={false}
                    >
                        {attendedGuests.length > 0 ? attendedGuests.map((guest) => (
                            <tr key={guest.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{guest.name}</td>
                                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>
                                    {guest.attendanceTime ? new Date(guest.attendanceTime).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just Registered"}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <Badge variant="success">Verified Pass</Badge>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} style={{ padding: '4rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Waiting for first delegate arrival...</div>
                                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.5rem' }}>The live feed will automatically update as guests scan their passes.</p>
                                </td>
                            </tr>
                        )}
                    </Table>
                </Card>
            </div>

            <footer style={{ marginTop: '5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Secure Corporate Portal · {event.corporateName} Intelligence Dashboard
                </p>
                <Link href="/corporate" style={{ textDecoration: 'none', color: 'var(--accent-gold)', fontSize: '0.9rem', fontWeight: 600 }}>
                    ← Log out of secure session
                </Link>
            </footer>
        </div>
    );
}
