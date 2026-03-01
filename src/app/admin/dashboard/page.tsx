"use client";

import styles from "./dashboard.module.css";

const hotels = [
    { id: 1, name: "The Grand Imperial", location: "Mumbai", rooms: 120, status: "Active" },
    { id: 2, name: "Royal Orchid", location: "Delhi", rooms: 85, status: "Active" },
    { id: 3, name: "Sunset Resort & Spa", location: "Goa", rooms: 45, status: "Active" },
];

export default function DashboardPage() {
    return (
        <div className="animate-fade-in">
            <div className={styles.dashboardHeader}>
                <h1 className={styles.title}>Overview</h1>
                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Indian Map</button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Onboarded Hotels</span>
                    <span className={styles.statValue}>142</span>
                    <span className={styles.statChange}>+12 this month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Subscriptions (INR)</span>
                    <span className={styles.statValue}>₹48.5L</span>
                    <span className={styles.statChange}>+5.2% vs last month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Guest QR Check-ins Today</span>
                    <span className={styles.statValue}>3,450</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contactless flow</span>
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Recent Hotel Activity</h2>
            <div className={styles.tableContainer}>
                <table className={styles.hotelTable}>
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <th>Location</th>
                            <th>Total Rooms</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hotels.map(hotel => (
                            <tr key={hotel.id}>
                                <td style={{ fontWeight: 500, color: 'var(--accent-gold)' }}>{hotel.name}</td>
                                <td>{hotel.location}</td>
                                <td>{hotel.rooms}</td>
                                <td><span className={styles.statusActive}>{hotel.status}</span></td>
                                <td>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>Manage &rarr;</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
