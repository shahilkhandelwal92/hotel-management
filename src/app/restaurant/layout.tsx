"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, ClipboardList, LogOut, PackageOpen, UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./restaurant.module.css";

const navItems = [
    { name: "Live orders", path: "/restaurant/orders", icon: ClipboardList },
    { name: "Menu & stock", path: "/restaurant/stock", icon: PackageOpen },
];

type RestaurantUser = {
    name: string;
    email: string;
    hotel?: { name?: string } | null;
    roles?: { role: { name: string } }[];
};

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<RestaurantUser | null>(null);

    useEffect(() => {
        fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) {
                router.replace("/login");
                return;
            }
            const data = await response.json();
            const roles = data.user?.roles?.map((assignment: { role: { name: string } }) => assignment.role.name) || [];
            if (!roles.some((role: string) => ["SUPER_ADMIN", "OWNER", "HOTEL_ADMIN", "KITCHEN", "RESTAURANT", "FNB_MANAGER"].includes(role))) {
                router.replace("/staff/dashboard");
                return;
            }
            setUser(data.user);
        });
    }, [router]);

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
    };

    return (
        <div className={styles.restaurantLayout}>
            <aside className={styles.sidebar}>
                <Link href="/restaurant/orders" className={styles.brand}>
                    <span className={styles.brandIcon}><UtensilsCrossed size={21} /></span>
                    <span><strong>StayOS</strong><small>Restaurant workspace</small></span>
                </Link>
                <nav className={styles.navMenu}>
                    {navItems.map(({ name, path, icon: Icon }) => (
                        <Link key={path} href={path} className={`${styles.navLink} ${pathname.startsWith(path) ? styles.navLinkActive : ""}`}>
                            <Icon size={18} />
                            <span>{name}</span>
                        </Link>
                    ))}
                </nav>
                <div className={styles.kitchenStatus}>
                    <span><ChefHat size={18} /></span>
                    <div><strong>Kitchen online</strong><small>Accepting room orders</small></div>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topBar}>
                    <div>
                        <small>Active outlet</small>
                        <strong>{user?.hotel?.name || "Hotel restaurant"}</strong>
                    </div>
                    <div className={styles.topActions}>
                        <ThemeToggle />
                        <div className={styles.user}>
                            <span>{user?.name?.slice(0, 1).toUpperCase() || "K"}</span>
                            <div><strong>{user?.name || "Kitchen team"}</strong><small>{user?.email}</small></div>
                        </div>
                        <button onClick={logout} className={styles.logout} aria-label="Sign out"><LogOut size={17} /></button>
                    </div>
                </header>
                <div className={styles.contentArea}>{children}</div>
            </main>
        </div>
    );
}
