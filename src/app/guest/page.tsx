"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

function GuestPassContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const [guest, setGuest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [requestStatus, setRequestStatus] = useState<"None" | "Pending" | "Approved" | "Paid">("None");
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    useEffect(() => {
        if (!token) {
            setError("Invalid Access Link");
            setLoading(false);
            return;
        }

        fetch(`/api/guests/verify/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.guest) {
                    setGuest(d.guest);
                    const latestReq = d.guest.requests?.[0];
                    if (latestReq) setRequestStatus(latestReq.status);
                } else {
                    setError("Guest not found. Please contact the front desk.");
                }
                setLoading(false);
            })
            .catch(() => {
                setError("Connection failed. Please refresh.");
                setLoading(false);
            });
    }, [token]);

    const handleServiceRequest = async (type: string) => {
        if (!guest) return;
        setRequestStatus("Pending");
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestId: guest.id, requestType: type })
            });
            if (!res.ok) setRequestStatus("None");
        } catch (err) {
            setRequestStatus("None");
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
            <div className="animate-pulse" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>SYNCING GUEST CREDENTIALS...</div>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center' }}>
            <div>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{error}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Authentication failed for this guest pass.</p>
            </div>
        </div>
    );

    const hotel = guest.event?.hotel;

    return (
        <div style={{ minHeight: '100vh', padding: '2rem 1rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 100, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        backdropFilter: "blur(10px)"
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                >
                    Logout
                </button>
                <ThemeToggle />
            </div>

            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                {/* Visual Ticket Design */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    position: 'relative'
                }}>
                    <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '2px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', letterSpacing: '2px', fontWeight: 700, marginBottom: '0.5rem' }}>OFFICIAL PASS</div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{hotel?.name || "The Imperial"}</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.4rem 0 0' }}>{hotel?.location || "Delhi NCR"}</p>
                    </div>

                    <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Allocated Room</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{guest.roomNumber || "402"}</div>
                            <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '0.4rem' }}>{guest.name}</div>
                        </div>

                        <div style={{
                            background: '#fff',
                            padding: '1rem',
                            borderRadius: '16px',
                            display: 'inline-block',
                            marginBottom: '1.5rem',
                            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
                        }}>
                            <div style={{
                                width: '180px', height: '180px', background: '#000',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                border: '1px solid #eee', fontWeight: 800, fontSize: '0.9rem'
                            }}>
                                QR CODE<br />{guest.id.substring(0, 8).toUpperCase()}
                            </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Present this code at the reception, elevator,<br />or amenities for instant verification.
                        </p>
                    </div>

                    {/* Half Circles for Ticket Effect */}
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-primary)', position: 'absolute', top: '23%', left: -15, border: '1px solid var(--border-color)' }} />
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-primary)', position: 'absolute', top: '23%', right: -15, border: '1px solid var(--border-color)' }} />
                </div>

                {/* Service Quick Actions */}
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Card title="Guest Services" subtitle="Instant room requests">
                        {requestStatus === "None" ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                <Button variant="outline" size="sm" onClick={() => handleServiceRequest("Extra Bed")}>🛏️ Extra Bed</Button>
                                <Button variant="outline" size="sm" onClick={() => handleServiceRequest("Housekeeping")}>🧹 Cleaning</Button>
                                <Button variant="outline" size="sm" onClick={() => handleServiceRequest("Laundry")}>🧺 Laundry</Button>
                                <Button variant="outline" size="sm" onClick={() => handleServiceRequest("Maintenance")}>🔧 Maintenance</Button>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 600 }}>Active Request</span>
                                    <Badge variant={requestStatus === "Approved" ? "success" : "warning"}>{requestStatus}</Badge>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {requestStatus === "Pending" ? "Staff is reviewing your request. Please wait." : "Request approved. Housekeeping is on the way."}
                                </p>
                                {requestStatus === "Approved" && (
                                    <Button variant="primary" style={{ width: '100%', marginTop: '1rem' }}>💳 Settle Payment</Button>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card title="Explore & Dining" subtitle="Make the most of your stay">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {hotel?.hasInHouseRestaurant ? (
                                <Link href="/guest/dining" style={{ textDecoration: 'none' }}>
                                    <Button variant="primary" style={{ width: '100%', padding: '1rem' }}>🍴 View In-House Menu</Button>
                                </Link>
                            ) : (
                                <>
                                    <a href="https://www.zomato.com" target="_blank" style={{ textDecoration: 'none' }}>
                                        <div style={{ padding: '1rem', background: '#E23744', color: '#fff', borderRadius: '12px', textAlign: 'center', fontWeight: 700 }}>Order on Zomato</div>
                                    </a>
                                    <a href="https://www.swiggy.com" target="_blank" style={{ textDecoration: 'none' }}>
                                        <div style={{ padding: '1rem', background: '#FC8019', color: '#fff', borderRadius: '12px', textAlign: 'center', fontWeight: 700 }}>Order on Swiggy</div>
                                    </a>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <p style={{ marginTop: '3rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                &copy; 2026 {hotel?.name} · Powered by Antigravity OS
            </p>
        </div>
    );
}

export default function GuestPass() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
                <div style={{ color: 'var(--accent-gold)' }}>INITIALIZING...</div>
            </div>
        }>
            <GuestPassContent />
        </Suspense>
    );
}
