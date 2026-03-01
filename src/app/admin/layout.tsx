"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Corporate Events", path: "/admin/events" },
    { name: "Event Scanner", path: "/admin/events/scanner" },
    { name: "Event Venues", path: "/admin/venues" },
    { name: "Inventory Map", path: "/admin/inventory" },
    { name: "Staff Roles & Audit", path: "/admin/users" },
    { name: "HR Attendance", path: "/admin/hr/attendance" },
    { name: "HR Leaves", path: "/admin/hr/leaves" },
    { name: "HR Policy Settings", path: "/admin/hr/settings" },
    { name: "Property Settings", path: "/admin/settings" },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>Grand Imperial Admin</div>
                <nav className={styles.navMenu}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
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
                    <div className={styles.userProfile}>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Super Admin</span>
                        <div className={styles.avatar}></div>
                    </div>
                </header>
                <div className={styles.contentArea}>
                    {children}
                </div>
            </main>
        </div>
    );
}
