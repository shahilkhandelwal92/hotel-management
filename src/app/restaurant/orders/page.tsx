"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChefHat, Clock3, DoorOpen, RefreshCw, UtensilsCrossed } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import styles from "../restaurant.module.css";

type Order = {
    id: string;
    tableNumber?: string | null;
    guestName?: string | null;
    orderSource: string;
    status: string;
    paymentStatus: string;
    grandTotal: number;
    createdAt: string;
    items: { id: string; quantity: number; notes?: string | null; menuItem: { name: string } }[];
};

const columns = [
    { status: "Pending", title: "New orders", icon: BellRing, next: "Preparing" },
    { status: "Preparing", title: "In the kitchen", icon: ChefHat, next: "Ready" },
    { status: "Ready", title: "Ready to serve", icon: UtensilsCrossed, next: "Delivered" },
];

const statusVariant: Record<string, "warning" | "primary" | "success" | "neutral"> = {
    Pending: "warning",
    Preparing: "primary",
    Ready: "success",
    Delivered: "neutral",
};

export default function LiveOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const response = await fetch("/api/pos/orders");
        const data = await response.json();
        if (!response.ok) setError(data.error || "Orders could not be loaded.");
        else setOrders(data.orders || []);
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        const initial = window.setTimeout(() => { void load(); }, 0);
        const refresh = window.setInterval(() => load(true), 12_000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(refresh);
        };
    }, [load]);

    const updateStatus = async (id: string, status: string) => {
        setUpdating(id);
        const response = await fetch("/api/pos/orders", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Order status could not be updated.");
        else setOrders((current) => current.map((order) => order.id === id ? data.order : order));
        setUpdating("");
    };

    const counts = useMemo(() => ({
        active: orders.filter((order) => ["Pending", "Preparing", "Ready"].includes(order.status)).length,
        roomService: orders.filter((order) => order.orderSource === "RoomService").length,
        completed: orders.filter((order) => ["Delivered", "Completed"].includes(order.status)).length,
    }), [orders]);

    return (
        <div className="animate-fade-in">
            <div className={styles.pageHeader}>
                <div>
                    <div className="page-eyebrow">Kitchen display system</div>
                    <h1>Live orders</h1>
                    <p>Move each ticket forward as the kitchen prepares and dispatches it.</p>
                </div>
                <Button variant="outline" onClick={() => load()} loading={loading}><RefreshCw size={16} /> Refresh</Button>
            </div>

            {error && <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div>}

            <div className={styles.stats}>
                <div><span className={styles.statViolet}><BellRing size={19} /></span><div><small>Active tickets</small><strong>{counts.active}</strong></div></div>
                <div><span className={styles.statMint}><DoorOpen size={19} /></span><div><small>Room service</small><strong>{counts.roomService}</strong></div></div>
                <div><span className={styles.statCoral}><Check size={19} /></span><div><small>Completed today</small><strong>{counts.completed}</strong></div></div>
            </div>

            <div className={styles.kanbanBoard}>
                {columns.map(({ status, title, icon: Icon, next }) => {
                    const columnOrders = orders.filter((order) => order.status === status);
                    return (
                        <section key={status} className={styles.kanbanColumn}>
                            <div className={styles.columnTitle}>
                                <span><Icon size={18} /> {title}</span>
                                <Badge variant={statusVariant[status]}>{columnOrders.length}</Badge>
                            </div>
                            <div className={styles.ticketList}>
                                {columnOrders.map((order) => (
                                    <article key={order.id} className={styles.orderCard}>
                                        <div className={styles.orderHeader}>
                                            <span>#{order.id.slice(0, 6).toUpperCase()}</span>
                                            <span><Clock3 size={13} /> {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                        <div className={styles.orderRoom}>
                                            <strong>{order.orderSource === "RoomService" ? `Room ${order.tableNumber || "TBA"}` : order.tableNumber ? `Table ${order.tableNumber}` : order.orderSource}</strong>
                                            <small>{order.guestName || "Walk-in guest"}</small>
                                        </div>
                                        <div className={styles.orderItems}>
                                            {order.items.map((item) => (
                                                <div key={item.id}>
                                                    <span>{item.quantity}×</span>
                                                    <strong>{item.menuItem.name}</strong>
                                                    {item.notes && <small>{item.notes}</small>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className={styles.ticketFooter}>
                                            <div><small>Total</small><strong>₹{order.grandTotal.toLocaleString("en-IN")}</strong></div>
                                            <Button size="sm" onClick={() => updateStatus(order.id, next)} loading={updating === order.id}>
                                                Move to {next}
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                                {!loading && columnOrders.length === 0 && (
                                    <div className={styles.columnEmpty}><Check size={19} /><span>No {status.toLowerCase()} tickets</span></div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
