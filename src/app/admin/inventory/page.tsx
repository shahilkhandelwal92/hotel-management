"use client";

import { useState } from "react";
import styles from "./inventory.module.css";

const MOCK_ROOMS = [
    { id: "1", number: "101", type: "Deluxe Room", price: 4500, breakfast: true, dinner: false },
    { id: "2", number: "102", type: "Executive Suite", price: 8500, breakfast: true, dinner: true },
];

const MOCK_AMENITIES = [
    { id: "1", name: "Spa Session (60 mins)", price: 2500 },
    { id: "2", name: "Extra Bed", price: 1000 },
];

const MOCK_MENU = [
    { id: "1", name: "Paneer Butter Masala", category: "Main Course", price: 350, isVeg: true, spice: "Medium" },
    { id: "2", name: "Butter Chicken", category: "Main Course", price: 450, isVeg: false, spice: "Medium" },
    { id: "3", name: "Vegetable Biryani", category: "Rice", price: 300, isVeg: true, spice: "High" },
];

export default function AdminInventoryPage() {
    const [activeTab, setActiveTab] = useState("Rooms");

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div className={styles.header}>
                <div>
                    <h1>Inventory & Menu Management</h1>
                    <p>Manage your rooms, amenities pricing, and restaurant offerings.</p>
                </div>
            </div>

            <div className={styles.tabs}>
                {["Rooms", "Amenities", "Restaurant Menu"].map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Rooms View */}
            {activeTab === "Rooms" && (
                <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 className={styles.cardTitle}>Room Inventory</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Room No.</th>
                                        <th>Type</th>
                                        <th>Base Price (₹)</th>
                                        <th>Inclusions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_ROOMS.map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 'bold' }}>{r.number}</td>
                                            <td>{r.type}</td>
                                            <td>₹{r.price}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    {r.breakfast && <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>🍳 Breakfast</span>}
                                                    {r.dinner && <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>🍲 Dinner</span>}
                                                    {!r.breakfast && !r.dinner && <span style={{ color: 'var(--text-secondary)' }}>Room Only</span>}
                                                </div>
                                            </td>
                                            <td><button className={`${styles.actionBtn} ${styles.deleteBtn}`}>Remove</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ width: '300px' }}>
                        <h2 className={styles.cardTitle}>Add Room</h2>
                        <div>
                            <input className={styles.inputField} placeholder="Room Number (e.g., 201)" />
                            <select className={styles.inputField}>
                                <option>Deluxe Room</option>
                                <option>Suite</option>
                            </select>
                            <input type="number" className={styles.inputField} placeholder="Price (₹)" />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }} />
                                    Includes Breakfast
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }} />
                                    Includes Dinner
                                </label>
                            </div>

                            <button className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%' }}>Add Room</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu View */}
            {activeTab === "Restaurant Menu" && (
                <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 className={styles.cardTitle}>In-House Dining Menu</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Category</th>
                                        <th>Price (₹)</th>
                                        <th>Diet & Spice</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_MENU.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                <span className={m.isVeg ? styles.vegBadge : styles.nonVegBadge}></span>
                                                {m.name}
                                            </td>
                                            <td>{m.category}</td>
                                            <td>₹{m.price}</td>
                                            <td><span className={styles.spicePill}>{m.spice} Spice</span></td>
                                            <td><button className={`${styles.actionBtn} ${styles.deleteBtn}`}>Remove</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ width: '300px' }}>
                        <h2 className={styles.cardTitle}>Add Dish</h2>
                        <div>
                            <input className={styles.inputField} placeholder="Dish Name (e.g. Dal Makhani)" />
                            <select className={styles.inputField}>
                                <option>Starters</option>
                                <option>Main Course</option>
                                <option>Breads</option>
                                <option>Desserts</option>
                                <option>Beverages</option>
                            </select>
                            <input type="number" className={styles.inputField} placeholder="Price (₹)" />

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dietary Restriction</label>
                            <select className={styles.inputField}>
                                <option value="true">Pure Veg 🟢</option>
                                <option value="false">Non-Veg 🔴</option>
                            </select>

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Spice Level</label>
                            <select className={styles.inputField}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                            <button className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%' }}>Add to Menu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Amenities View (Simplified Placeholder) */}
            {activeTab === "Amenities" && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Hotel Amenities Pricing</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Configure optional add-ons guests can book to their room.</p>
                    {/* Simplified table map similar to rooms */}
                </div>
            )}
        </div>
    );
}
