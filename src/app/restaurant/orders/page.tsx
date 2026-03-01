"use client";

import { useState } from "react";
import styles from "../restaurant.module.css";

// Mocks representing pending FoodOrders from the database
const INITIAL_ORDERS = [
    { id: "ord_1", room: "402", guest: "Arjun Sharma", time: "10 mins ago", status: "Pending", items: ["2x Butter Chicken", "4x Garlic Naan"] },
    { id: "ord_2", room: "105", guest: "Priya Patel", time: "25 mins ago", status: "Preparing", items: ["1x Veg Biryani", "1x Raita", "2x Coke"] },
    { id: "ord_3", room: "310", guest: "Rohan Singh", time: "45 mins ago", status: "Ready", items: ["1x Paneer Tikka"] },
];

export default function LiveOrdersPage() {
    const [orders, setOrders] = useState(INITIAL_ORDERS);

    const moveOrder = (id: string, newStatus: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    const getOrdersByStatus = (status: string) => orders.filter(o => o.status === status);

    const renderColumn = (title: string, status: string, nextStatus: string | null) => (
        <div className={styles.kanbanColumn}>
            <div className={styles.columnTitle}>
                {title}
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                    {getOrdersByStatus(status).length}
                </span>
            </div>

            {getOrdersByStatus(status).map(order => (
                <div key={order.id} className={styles.orderCard} onClick={() => nextStatus && moveOrder(order.id, nextStatus)}>
                    <div className={styles.orderHeader}>
                        <span>#{order.id.split('_')[1]}</span>
                        <span style={{ color: status === 'Pending' ? '#ef4444' : 'var(--text-secondary)' }}>{order.time}</span>
                    </div>
                    <div className={styles.roomNo}>Room {order.room}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{order.guest}</div>

                    <ul className={styles.orderItems}>
                        {order.items.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>

                    {nextStatus && (
                        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                            Click to move to {nextStatus} ➔
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <div>
                    <h1>Live Kitchen Orders</h1>
                    <p>Tap a ticket to advance its preparation state. Delivered orders are fully completed.</p>
                </div>
            </div>

            <div className={styles.kanbanBoard}>
                {renderColumn("New Tickets (Pending)", "Pending", "Preparing")}
                {renderColumn("Cooking (Preparing)", "Preparing", "Ready")}
                {renderColumn("Out for Delivery (Ready)", "Ready", "Delivered")}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                {getOrdersByStatus("Delivered").length} orders successfully delivered today!
            </div>
        </div>
    );
}
