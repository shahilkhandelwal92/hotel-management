"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./restaurant.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
    { name: "Live Orders", path: "/restaurant/orders" },
    { name: "Grocery Stock", path: "/restaurant/stock" },
];

export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <div className={styles.restaurantLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    Grand Imperial
                    <span>Kitchen & Dining</span>
                </div>
                <nav className={styles.navMenu}>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topBar}>
                    <div style={{ flex: 1 }}></div>
                    <ThemeToggle />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500 }}>Head Chef</div>
                            <div style={{ fontSize: "0.75rem", color: "#10b981" }}>Kitchen Online</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                color: "#ef4444",
                                padding: "0.4rem 0.8rem",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ef4444"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.1)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                        >
                            Logout
                        </button>
                    </div>
                </header>
                <div className={styles.contentArea}>
                    {children}
                </div>
            </main>
        </div>
    );
}
