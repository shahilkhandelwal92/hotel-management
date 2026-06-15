"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Building2, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./staff.module.css";

type StaffUser = {
    name: string;
    email: string;
    hotel?: { name?: string } | null;
    roles?: { role: { name: string } }[];
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<StaffUser | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) {
                router.replace("/login");
                return;
            }
            const data = await response.json();
            setUser(data.user);
        });
    }, [router]);

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
    };

    return (
        <div className={styles.staffLayout}>
            <header className={styles.topBar}>
                <Link href="/staff/dashboard" className={styles.brand}>
                    <span><Building2 size={20} /></span>
                    <div><strong>StayOS People</strong><small>{user?.hotel?.name || "Employee workspace"}</small></div>
                </Link>
                <div className={styles.headerActions}>
                    <button className={styles.iconButton} aria-label="Notifications"><Bell size={17} /></button>
                    <ThemeToggle />
                    <div className={styles.profile}>
                        <span>{user?.name?.slice(0, 1).toUpperCase() || "S"}</span>
                        <div><strong>{user?.name || "Loading..."}</strong><small>{user?.roles?.[0]?.role.name || "Staff"}</small></div>
                    </div>
                    <button className={styles.iconButton} onClick={logout} aria-label="Sign out"><LogOut size={17} /></button>
                </div>
            </header>
            <main className={styles.contentArea}>{children}</main>
        </div>
    );
}
