"use client";

import styles from "./staff.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.staffLayout}>
            <header className={styles.topBar}>
                <Link href="/staff/dashboard" className={styles.brand} style={{ textDecoration: 'none' }}>
                    Grand Imperial Staff
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <ThemeToggle />
                    <div className={styles.userProfile}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500 }}>Arjun Sharma</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Front Desk</div>
                        </div>
                        <div className={styles.avatar}></div>
                    </div>
                </div>
            </header>

            <main className={styles.contentArea}>
                {children}
            </main>
        </div>
    );
}
