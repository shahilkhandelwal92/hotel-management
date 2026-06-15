"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Check,
    ChefHat,
    ChevronRight,
    Minus,
    Plus,
    Search,
    ShoppingBag,
    Sparkles,
    UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import styles from "./dining.module.css";

type MenuItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    isVeg: boolean;
    spiceLevel: string;
};

type StayData = {
    guestName: string;
    status: string;
    room?: { number: string } | null;
    hotel: { name: string; hasInHouseRestaurant?: boolean };
    menuItems: MenuItem[];
    orders: {
        id: string;
        status: string;
        grandTotal: number;
        items: { id: string; quantity: number; menuItem: { name: string } }[];
    }[];
};

type CartLine = MenuItem & { quantity: number };

const statusSteps = ["Pending", "Preparing", "Ready", "Delivered"];

function money(value: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function GuestDiningPage() {
    const [stay, setStay] = useState<StayData | null>(null);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [category, setCategory] = useState("All");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        const response = await fetch("/api/guest/stay");
        const data = await response.json();
        if (!response.ok) setError(data.error || "Your stay session has expired.");
        else setStay(data.stay);
        setLoading(false);
    };

    useEffect(() => {
        const initial = window.setTimeout(() => { void load(); }, 0);
        const refresh = window.setInterval(load, 15_000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(refresh);
        };
    }, []);

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(stay?.menuItems.map((item) => item.category) || []))],
        [stay],
    );
    const visibleItems = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return (stay?.menuItems || []).filter((item) =>
            (category === "All" || item.category === category) &&
            (!normalized || item.name.toLowerCase().includes(normalized)),
        );
    }, [category, query, stay]);
    const cartLines = Object.values(cart);
    const subtotal = cartLines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxes = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + taxes;
    const latestOrder = stay?.orders[0];

    const changeQuantity = (item: MenuItem, change: number) => {
        setCart((current) => {
            const quantity = (current[item.id]?.quantity || 0) + change;
            if (quantity <= 0) {
                const next = { ...current };
                delete next[item.id];
                return next;
            }
            return { ...current, [item.id]: { ...item, quantity } };
        });
    };

    const placeOrder = async () => {
        if (cartLines.length === 0) return;
        setPlacing(true);
        setError("");
        const response = await fetch("/api/guest/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: cartLines.map((item) => ({
                    menuItemId: item.id,
                    quantity: item.quantity,
                })),
            }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Your order could not be placed.");
        else {
            setCart({});
            await load();
        }
        setPlacing(false);
    };

    if (loading && !stay) {
        return <div className={styles.center}><ChefHat className="animate-pulse" size={34} /><h2>Opening the kitchen menu</h2></div>;
    }

    if (!stay) {
        return <div className={styles.center}><h2>Dining unavailable</h2><p>{error}</p><Link href="/guest"><Button variant="outline">Back to stay</Button></Link></div>;
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <Link href="/guest" className={styles.back}><ArrowLeft size={18} /> Stay</Link>
                <div className={styles.title}>
                    <span><UtensilsCrossed size={20} /></span>
                    <div><strong>{stay.hotel.name}</strong><small>In-room dining · Room {stay.room?.number || "TBA"}</small></div>
                </div>
                <Badge variant={stay.status === "CheckedIn" ? "success" : "warning"}>{stay.status}</Badge>
            </header>

            <div className={styles.content}>
                <section className={styles.hero}>
                    <div>
                        <div className={styles.eyebrow}><Sparkles size={14} /> Made fresh for your stay</div>
                        <h1>What are you craving, {stay.guestName.split(" ")[0]}?</h1>
                        <p>Order from the live hotel menu. Your bill is added to the room folio automatically.</p>
                    </div>
                    <div className={styles.search}>
                        <Search size={18} />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dishes" />
                    </div>
                </section>

                {error && <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div>}

                {latestOrder && (
                    <section className={styles.tracker}>
                        <div className={styles.trackerHead}>
                            <div><small>Live order</small><strong>#{latestOrder.id.slice(0, 6).toUpperCase()}</strong></div>
                            <Badge variant={latestOrder.status === "Delivered" ? "success" : "primary"}>{latestOrder.status}</Badge>
                        </div>
                        <div className={styles.steps}>
                            {statusSteps.map((step, index) => {
                                const activeIndex = Math.max(0, statusSteps.indexOf(latestOrder.status));
                                const complete = index <= activeIndex;
                                return (
                                    <div key={step} data-complete={complete}>
                                        <span>{complete ? <Check size={13} /> : index + 1}</span>
                                        <small>{step}</small>
                                    </div>
                                );
                            })}
                        </div>
                        <p>{latestOrder.items.map((item) => `${item.quantity}× ${item.menuItem.name}`).join(" · ")}</p>
                    </section>
                )}

                <nav className={styles.categories} aria-label="Menu categories">
                    {categories.map((name) => (
                        <button key={name} data-active={category === name} onClick={() => setCategory(name)}>{name}</button>
                    ))}
                </nav>

                <section className={styles.menuGrid}>
                    {visibleItems.map((item) => {
                        const quantity = cart[item.id]?.quantity || 0;
                        return (
                            <article key={item.id} className={styles.menuCard}>
                                <div className={styles.foodVisual} data-veg={item.isVeg}>
                                    <span>{item.isVeg ? "VEG" : "NON-VEG"}</span>
                                </div>
                                <div className={styles.menuInfo}>
                                    <div className={styles.menuMeta}>
                                        <Badge variant={item.isVeg ? "success" : "danger"}>{item.isVeg ? "Veg" : "Non-veg"}</Badge>
                                        <small>{item.spiceLevel} spice</small>
                                    </div>
                                    <h3>{item.name}</h3>
                                    <p>{item.category}</p>
                                    <div className={styles.menuFooter}>
                                        <strong>{money(item.price)}</strong>
                                        {quantity === 0 ? (
                                            <button className={styles.add} onClick={() => changeQuantity(item, 1)}>Add <Plus size={15} /></button>
                                        ) : (
                                            <div className={styles.stepper}>
                                                <button onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${item.name}`}><Minus size={14} /></button>
                                                <span>{quantity}</span>
                                                <button onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${item.name}`}><Plus size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                    {visibleItems.length === 0 && <div className={styles.empty}>No dishes match this filter.</div>}
                </section>
            </div>

            {cartLines.length > 0 && (
                <aside className={styles.cartBar}>
                    <div className={styles.cartCount}><ShoppingBag size={19} /><span>{cartLines.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
                    <div className={styles.cartPrice}><small>Including 5% tax</small><strong>{money(total)}</strong></div>
                    <button onClick={placeOrder} disabled={placing}>
                        {placing ? "Placing order..." : "Place room-service order"} <ChevronRight size={18} />
                    </button>
                </aside>
            )}
        </main>
    );
}
