"use client";

import { useState } from "react";
import styles from "./dining.module.css";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

// Mock Data
const MOCK_HOTEL = {
    zomatoLink: "https://www.zomato.com/ncr/restaurants"
};

const MENU_ITEMS = [
    { id: "m1", name: "Paneer Butter Masala", category: "Main Course", price: 350, isVeg: true, spice: "Medium" },
    { id: "m2", name: "Butter Chicken", category: "Main Course", price: 450, isVeg: false, spice: "Medium" },
    { id: "m3", name: "Garlic Naan", category: "Breads", price: 60, isVeg: true, spice: "Low" },
    { id: "m4", name: "Chicken Tikka", category: "Starters", price: 320, isVeg: false, spice: "High" },
    { id: "m5", name: "Vegetable Biryani", category: "Rice", price: 300, isVeg: true, spice: "High" },
];

export default function GuestDiningPage() {
    const [cart, setCart] = useState<{ id: string, name: string, price: number, qty: number }[]>([]);
    const [orderStatus, setOrderStatus] = useState<"None" | "Pending" | "Preparing" | "Ready" | "Delivered">("None");

    const addToCart = (item: any) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { id: item.id, name: item.name, price: item.price, qty: 1 }]);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const placeOrder = () => {
        if (cart.length === 0) return;
        setOrderStatus("Pending");
        // Simulate Order Progress internally for demonstration
        setTimeout(() => setOrderStatus("Preparing"), 4000);
        setTimeout(() => setOrderStatus("Ready"), 8000);
        setTimeout(() => setOrderStatus("Delivered"), 12000);
    };

    const groupedMenu = MENU_ITEMS.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, typeof MENU_ITEMS>);

    return (
        <div className={styles.diningContainer}>
            <div style={{ position: 'fixed', top: '2rem', right: '2rem' }}>
                <ThemeToggle />
            </div>

            <div className={styles.header}>
                <Link href="/guest" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
                    ← Back to Guest Pass
                </Link>
                <h1>In-Room Dining</h1>
                <p>Order fresh, chef-prepared meals directly to Room 402.</p>
            </div>

            {MOCK_HOTEL.zomatoLink && (
                <a href={MOCK_HOTEL.zomatoLink} target="_blank" rel="noopener noreferrer" className={styles.zomatoBtn}>
                    Looking for outside food? Order on Zomato
                </a>
            )}

            <div className="animate-fade-in">
                {Object.keys(groupedMenu).map(category => (
                    <div key={category} className={styles.menuSection}>
                        <h2 className={styles.categoryTitle}>{category}</h2>
                        {groupedMenu[category].map(item => (
                            <div key={item.id} className={styles.menuItemCard}>
                                <div className={styles.itemInfo}>
                                    <div className={styles.itemName}>
                                        <div className={item.isVeg ? styles.vegBadge : styles.nonVegBadge}></div>
                                        {item.name}
                                    </div>
                                    <div className={styles.itemPrice}>₹{item.price}</div>
                                    <div className={styles.itemTags}>
                                        <span className={styles.spicePill}>{item.spice} Spice</span>
                                    </div>
                                </div>
                                <div>
                                    <button className={styles.addBtn} onClick={() => addToCart(item)}>Add</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Bottom Floating Bar */}
            {orderStatus === "None" ? (
                cart.length > 0 && (
                    <div className={`animate-fade-in ${styles.bottomBar}`}>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ₹{cartTotal}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {cart.reduce((a, c) => a + c.qty, 0)} Items
                            </div>
                        </div>
                        <button className={styles.checkoutBtn} onClick={placeOrder}>
                            Place Order
                        </button>
                    </div>
                )
            ) : (
                <div className={`animate-fade-in ${styles.bottomBar}`}>
                    <div className={styles.trackerStatus}>
                        {orderStatus === "Pending" && <div className={styles.statusIcon} style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>🕒</div>}
                        {orderStatus === "Preparing" && <div className={styles.statusIcon} style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>👨‍🍳</div>}
                        {orderStatus === "Ready" && <div className={styles.statusIcon} style={{ background: 'rgba(16,185,129,0.2)' }}>🛎️</div>}
                        {orderStatus === "Delivered" && <div className={styles.statusIcon} style={{ background: 'rgba(16,185,129,0.2)' }}>✅</div>}

                        <div>
                            <div style={{ fontSize: '1.1rem' }}>
                                {orderStatus === "Pending" && "Order received by kitchen"}
                                {orderStatus === "Preparing" && "Chef is preparing your meal"}
                                {orderStatus === "Ready" && "Out for delivery to room 402"}
                                {orderStatus === "Delivered" && "Enjoy your meal!"}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                {orderStatus !== "Delivered" ? "Live tracking update" : "Order complete"}
                            </div>
                        </div>
                    </div>
                    {orderStatus === "Delivered" && (
                        <button className={styles.checkoutBtn} onClick={() => { setOrderStatus("None"); setCart([]); }}>
                            New Order
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
