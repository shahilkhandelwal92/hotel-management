"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
    Activity,
    BedDouble,
    BookOpenCheck,
    Boxes,
    BriefcaseBusiness,
    Building2,
    CalendarCheck2,
    CalendarDays,
    ChartNoAxesCombined,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ConciergeBell,
    CreditCard,
    FileChartColumn,
    FileText,
    House,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    PackageSearch,
    ReceiptText,
    ScanLine,
    Settings2,
    ShieldCheck,
    Sparkles,
    Store,
    Tags,
    UserRoundCog,
    UsersRound,
    UtensilsCrossed,
    WalletCards,
    X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HotelSwitcher } from "@/components/HotelSwitcher";
import styles from "./Sidebar.module.css";

export interface NavItem {
    label: string;
    path?: string;
    icon: string;
    section?: boolean;
    requiredPermission?: string;
    allowedRoles?: string[];
}

interface SidebarProps {
    brand: string;
    brandSub?: string;
    navItems: NavItem[];
    userRole: string;
    userRoles?: string[];
    userEmail?: string;
    userPermissions?: string[];
    isSuperAdmin?: boolean;
}

const icons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    dashboard: LayoutDashboard,
    reservations: ConciergeBell,
    rooms: BedDouble,
    rates: Tags,
    audit: BookOpenCheck,
    housekeeping: Sparkles,
    lost: PackageSearch,
    events: CalendarDays,
    scanner: ScanLine,
    venues: Building2,
    invoices: ReceiptText,
    tax: FileText,
    guests: UsersRound,
    amenities: CalendarCheck2,
    orders: UtensilsCrossed,
    menu: Store,
    payroll: WalletCards,
    attendance: ClipboardCheck,
    leaves: CalendarCheck2,
    policies: BriefcaseBusiness,
    analytics: ChartNoAxesCombined,
    reports: FileChartColumn,
    users: UserRoundCog,
    settings: Settings2,
    roles: ShieldCheck,
    monitoring: Activity,
    onboarding: Building2,
    access: KeyRound,
    inventory: Boxes,
    folio: CreditCard,
};

function resolveIcon(item: NavItem) {
    const lookup = item.icon.toLowerCase();
    return icons[lookup] || House;
}

export function Sidebar({
    brand,
    brandSub,
    navItems,
    userRole,
    userRoles = [],
    userEmail,
    userPermissions,
    isSuperAdmin,
}: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <>
            <button
                className={styles.mobileTrigger}
                onClick={() => setMobileOpen((value) => !value)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            >
                {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>

            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${mobileOpen ? styles.mobileOpen : ""}`}>
                <div className={styles.brand}>
                    <div className={styles.brandMark}><Building2 size={21} /></div>
                    {!collapsed && (
                        <div className={styles.brandCopy}>
                            <div className={styles.brandName}>{brand}</div>
                            {brandSub && <div className={styles.brandSub}>{brandSub}</div>}
                        </div>
                    )}
                    <button
                        className={styles.collapseButton}
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <HotelSwitcher collapsed={collapsed} />

                <nav className={styles.nav} aria-label="Primary navigation">
                    {navItems.map((item, index) => {
                        if (item.requiredPermission && !isSuperAdmin && !userPermissions?.includes(item.requiredPermission)) {
                            return null;
                        }
                        if (item.allowedRoles?.length && !isSuperAdmin && !item.allowedRoles.some((role) => userRoles.includes(role))) {
                            return null;
                        }
                        if (item.section) {
                            return (
                                <div
                                    key={`${item.label}-${index}`}
                                    className={collapsed ? styles.sectionCollapsed : styles.section}
                                >
                                    {item.label.replace(/^[─\s]+|[─\s]+$/g, "")}
                                </div>
                            );
                        }
                        if (!item.path) return null;

                        const Icon = resolveIcon(item);
                        const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                title={collapsed ? item.label : undefined}
                                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon className={styles.navIcon} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <div className={styles.profile}>
                        <div className={styles.avatar}>{userRole.slice(0, 2).toUpperCase()}</div>
                        {!collapsed && (
                            <div className={styles.profileCopy}>
                                <div className={styles.profileRole}>{userRole || "Loading"}</div>
                                <div className={styles.profileEmail}>{userEmail || "Secure workspace"}</div>
                            </div>
                        )}
                    </div>
                    <div className={styles.footerActions}>
                        <ThemeToggle />
                        <button className={styles.logout} onClick={handleLogout} title="Sign out">
                            <LogOut size={15} />
                            {!collapsed && <span>Sign out</span>}
                        </button>
                    </div>
                </div>
            </aside>
            <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
        </>
    );
}
