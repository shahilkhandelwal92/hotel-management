"use client";

import { useState } from "react";
import styles from "../inventory/inventory.module.css"; // Reusing inventory styles for consistency

// Mocks for Event Venues
const MOCK_VENUES = [
    { id: "1", name: "Grand Ballroom", capacity: 500, basePrice: 50000, decorPrice: 15000, foodPerHead: 1200 },
    { id: "2", name: "Poolside Lawn", capacity: 150, basePrice: 20000, decorPrice: 5000, foodPerHead: 800 },
];

const MOCK_BOOKINGS = [
    {
        id: "b1", guestName: "Rahul Verma", eventType: "Wedding",
        venue: "Grand Ballroom", dates: "15 Oct - 17 Oct", guests: 400,
        estimatedCost: 1650000, status: "Pending"
    },
    {
        id: "b2", guestName: "TechCorp India", eventType: "Corporate",
        venue: "Poolside Lawn", dates: "20 Oct", guests: 80,
        estimatedCost: 89000, status: "Confirmed"
    }
];

export default function AdminVenuesPage() {
    const [activeTab, setActiveTab] = useState("Venues");
    const [bookings, setBookings] = useState(MOCK_BOOKINGS);

    const handleApprove = (id: string) => {
        setBookings(bookings.map(b => b.id === id ? { ...b, status: "Confirmed" } : b));
    };

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div className={styles.header}>
                <div>
                    <h1>Event Venues & Party Bookings</h1>
                    <p>Manage your banquet halls, lawns, and incoming event reservations.</p>
                </div>
            </div>

            <div className={styles.tabs}>
                {["Venues", "Booking Requests"].map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Venues View */}
            {activeTab === "Venues" && (
                <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 className={styles.cardTitle}>Managed Spaces</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Venue Name</th>
                                        <th>Max Capacity</th>
                                        <th>Base Rent/Day</th>
                                        <th>Fixed Decor</th>
                                        <th>Food/Head</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_VENUES.map(v => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 'bold' }}>{v.name}</td>
                                            <td>{v.capacity} Pax</td>
                                            <td>₹{v.basePrice.toLocaleString()}</td>
                                            <td>₹{v.decorPrice.toLocaleString()}</td>
                                            <td>₹{v.foodPerHead.toLocaleString()}</td>
                                            <td><button className={`${styles.actionBtn} ${styles.deleteBtn}`}>Remove</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ width: '320px' }}>
                        <h2 className={styles.cardTitle}>Add New Venue</h2>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Venue Name</label>
                            <input className={styles.inputField} placeholder="e.g., The Crystal Hall" />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Capacity (Guests)</label>
                            <input type="number" className={styles.inputField} placeholder="e.g., 200" />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Base Rental/Day (₹)</label>
                            <input type="number" className={styles.inputField} placeholder="e.g., 25000" />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Standard Decoration Cost (₹)</label>
                            <input type="number" className={styles.inputField} placeholder="e.g., 10000" />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Catering Cost/Person (₹)</label>
                            <input type="number" className={styles.inputField} placeholder="e.g., 850" />

                            <button className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%', marginTop: '1rem' }}>Add Venue</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bookings View */}
            {activeTab === "Booking Requests" && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Event Reservations</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Event Details</th>
                                    <th>Venue & Dates</th>
                                    <th>Est. Value</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 'bold' }}>{b.guestName}</td>
                                        <td>
                                            <div>{b.eventType}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.guests} Guests</div>
                                        </td>
                                        <td>
                                            <div>{b.venue}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.dates}</div>
                                        </td>
                                        <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>₹{b.estimatedCost.toLocaleString()}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.3rem 0.6rem',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: b.status === "Pending" ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: b.status === "Pending" ? '#f59e0b' : '#10b981'
                                            }}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>
                                            {b.status === "Pending" ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleApprove(b.id)} className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ padding: '0.4rem 0.8rem' }}>Approve</button>
                                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} style={{ padding: '0.4rem 0.8rem' }}>Reject</button>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Processed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
