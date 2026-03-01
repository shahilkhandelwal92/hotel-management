"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "../admin/admin.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
    { name: "Global Leads (CRM)", path: "/owner/leads" },
    { name: "Financial FY Reports", path: "/owner/finance" },
];

export default function OwnerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className={styles.adminLayout}>
            <aside className={`${styles.sidebar} ${styles.ownerSidebar}`} style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--accent-gold)' }}>
                <div className={styles.brand} style={{ color: 'var(--accent-gold)' }}>Grand Imperial<br />Enterprise HQ</div>
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
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>Project Owner</span>
                            <button onClick={handleLogout} style={{ fontSize: "0.75rem", color: "var(--accent-gold)", background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>Logout</button>
                        </div>
                        <div className={styles.avatar} style={{ border: '2px solid var(--accent-gold)' }}></div>
                    </div>
                </header>
                <div className={styles.contentArea}>
                    {children}
                </div>
            </main>
        </div>
    );
}
