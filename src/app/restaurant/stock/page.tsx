"use client";

import { useState } from "react";
import styles from "../restaurant.module.css";

// Mock Data
const INITIAL_STOCK = [
    { id: "1", name: "Basmati Rice", quantity: 45, unit: "kg", alertAt: 20 },
    { id: "2", name: "Chicken (Fresh)", quantity: 8, unit: "kg", alertAt: 15 }, // Needs restock
    { id: "3", name: "Cooking Oil", quantity: 50, unit: "liters", alertAt: 10 },
    { id: "4", name: "Onions", quantity: 12, unit: "kg", alertAt: 25 }, // Needs restock
];

export default function GroceryStockPage() {
    const [stock, setStock] = useState(INITIAL_STOCK);

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <div>
                    <h1>Grocery Inventory</h1>
                    <p>Monitor kitchen supplies and re-order levels.</p>
                </div>
            </div>

            <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                <th>Item Name</th>
                                <th>Current Quantity</th>
                                <th>Min Alert Threshold</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map(item => {
                                const isLow = item.quantity <= item.alertAt;
                                return (
                                    <tr key={item.id} className={isLow ? styles.lowStock : ''}>
                                        <td style={{ color: isLow ? '#ef4444' : 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                                        <td>{item.quantity} {item.unit}</td>
                                        <td>{item.alertAt} {item.unit}</td>
                                        <td>
                                            {isLow ? (
                                                <span style={{ padding: '0.2rem 0.5rem', background: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                    Needs Restock!
                                                </span>
                                            ) : (
                                                <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Adequate</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ width: '300px', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Add Delivery</h3>
                    <input className={styles.inputField} placeholder="Item Name" />
                    <input type="number" className={styles.inputField} placeholder="Quantity" />
                    <input className={styles.inputField} placeholder="Unit (kg, packet)" />
                    <button className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%' }}>Update Stock</button>

                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Items dropping below their minimum alert threshold automatically flag in red.
                    </div>
                </div>
            </div>
        </div>
    );
}
