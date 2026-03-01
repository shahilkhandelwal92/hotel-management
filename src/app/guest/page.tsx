"use client";

import { useEffect, useState, Suspense } from "react";
import styles from "./guest.module.css";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const MOCK_HOTEL_CONFIG = {
    hasInHouseRestaurant: false,
    zomatoLink: "https://www.zomato.com/ncr/restaurants",
    swiggyLink: "https://www.swiggy.com/restaurants"
};

function GuestPassContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "DEMO-TOKEN-123";
    const [mounted, setMounted] = useState(false);
    const [requestStatus, setRequestStatus] = useState<"None" | "Pending" | "Approved" | "Paid">("None");

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className={styles.guestContainer}>
            <div className={`animate-fade-in ${styles.ticket}`}>
                <div className={styles.ticketHeader}>
                    <div className={styles.hotelName}>The Grand Imperial</div>
                    <div className={styles.bookingInfo}>
                        <h2>Room 402</h2>
                        <p className="text-secondary">Arjun Sharma</p>
                    </div>
                </div>

                <div className={styles.qrSection}>
                    <div className={styles.qrWrapper}>
                        <div className={styles.qrPlaceholder}>
                            <div style={{ background: 'white', padding: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center' }}>
                                    QR CODE<br />{token}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className={styles.statusText}>
                        Hold your phone near the scanner to access<br />
                        your room, gym, and hotel services.
                    </p>
                </div>

                <div className={styles.actionSection}>
                    {MOCK_HOTEL_CONFIG.hasInHouseRestaurant ? (
                        <button className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                            🍴 View In-House Menu
                        </button>
                    ) : (
                        <>
                            <div className={styles.deliveryHeader}>
                                No In-House Restaurant.<br />Order Local Delivery to Your Room:
                            </div>
                            {MOCK_HOTEL_CONFIG.zomatoLink && (
                                <a href={MOCK_HOTEL_CONFIG.zomatoLink} target="_blank" rel="noopener noreferrer" className={`${styles.actionBtn} ${styles.zomatoBtn}`}>
                                    Order on Zomato
                                </a>
                            )}
                            {MOCK_HOTEL_CONFIG.swiggyLink && (
                                <a href={MOCK_HOTEL_CONFIG.swiggyLink} target="_blank" rel="noopener noreferrer" className={`${styles.actionBtn} ${styles.swiggyBtn}`}>
                                    Order on Swiggy
                                </a>
                            )}
                        </>
                    )}

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Guest Services</h3>

                        {requestStatus === "None" && (
                            <button onClick={() => setRequestStatus("Pending")} className={styles.actionBtn} style={{ background: 'transparent', border: '2px solid var(--text-primary)', color: 'var(--text-primary)', padding: '0.8rem' }}>
                                🛏️ Request Extra Bed
                            </button>
                        )}

                        {requestStatus !== "None" && (
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🛏️ Extra Bed Request</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Status: <span style={{ color: requestStatus === 'Pending' ? '#f59e0b' : requestStatus === 'Approved' ? '#3b82f6' : '#10b981', fontWeight: 600 }}>{requestStatus}</span>
                                </div>

                                {requestStatus === "Pending" && (
                                    <div style={{ padding: '0.8rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '0.85rem' }}>
                                        Awaiting staff review...
                                    </div>
                                )}

                                {requestStatus === "Approved" && (
                                    <>
                                        <div style={{ padding: '0.8rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                            Staff approved your request. A setup charge of ₹1,000 applies.
                                        </div>
                                        <button onClick={() => setRequestStatus("Paid")} className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                                            💳 Pay ₹1,000 Now
                                        </button>
                                    </>
                                )}

                                {requestStatus === "Paid" && (
                                    <div style={{ padding: '0.8rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem' }}>
                                        ✓ Payment successful! Housekeeping is bringing your bed up now.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <div style={{ position: 'fixed', top: '2rem', right: '2rem' }}>
                <ThemeToggle />
            </div>
        </div>
    );
}

// Wrap in Suspense — required by Next.js when using useSearchParams() in a page component
export default function GuestPass() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading...</div>}>
            <GuestPassContent />
        </Suspense>
    );
}
