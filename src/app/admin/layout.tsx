"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar, NavItem } from "@/components/Sidebar";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import FeedbackWidget from "@/components/FeedbackWidget";

const navItems: NavItem[] = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },

    { label: "PMS", section: true, icon: "" },
    { label: "Reservations", path: "/admin/reservations", icon: "reservations", requiredPermission: "MANAGE_BOOKINGS" },
    { label: "Room Inventory", path: "/admin/inventory", icon: "rooms", requiredPermission: "MANAGE_INVENTORY" },
    { label: "Rate Plans", path: "/admin/rate-plans", icon: "rates", requiredPermission: "MANAGE_BOOKINGS" },
    { label: "Night Audit", path: "/admin/night-audit", icon: "audit", requiredPermission: "MANAGE_BOOKINGS" },
    { label: "Housekeeping", path: "/admin/housekeeping", icon: "housekeeping", requiredPermission: "MANAGE_HOUSEKEEPING" },
    { label: "Lost & Found", path: "/admin/housekeeping/lost-found", icon: "lost", requiredPermission: "MANAGE_HOUSEKEEPING" },

    { label: "Events", section: true, icon: "" },
    { label: "Corporate Events", path: "/admin/events", icon: "events", requiredPermission: "MANAGE_EVENTS" },
    { label: "Event Scanner", path: "/admin/events/scanner", icon: "scanner", requiredPermission: "MANAGE_EVENTS" },
    { label: "Event Venues", path: "/admin/venues", icon: "venues", requiredPermission: "MANAGE_EVENTS" },

    { label: "Billing", section: true, icon: "", allowedRoles: ["ACCOUNTING"] },
    { label: "Guest Folios", path: "/admin/billing/folio", icon: "folio", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },
    { label: "Invoices", path: "/admin/billing/invoices", icon: "invoices", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },
    { label: "GST / Tax Config", path: "/admin/accounting/tax-config", icon: "tax", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },

    { label: "Guest Experience", section: true, icon: "" },
    { label: "Guest Profiles", path: "/admin/crm/guests", icon: "guests", requiredPermission: "MANAGE_GUESTS" },
    { label: "Amenities", path: "/admin/amenities/dashboard", icon: "amenities", requiredPermission: "MANAGE_INVENTORY" },

    { label: "Restaurant", section: true, icon: "" },
    { label: "POS Orders", path: "/restaurant/orders", icon: "orders", requiredPermission: "MANAGE_POS" },
    { label: "Menu & Stock", path: "/restaurant/stock", icon: "menu", requiredPermission: "MANAGE_POS" },

    { label: "People", section: true, icon: "" },
    { label: "Payroll", path: "/admin/payroll", icon: "payroll", requiredPermission: "MANAGE_HR" },
    { label: "Attendance", path: "/admin/hr/attendance", icon: "attendance", requiredPermission: "MANAGE_HR" },
    { label: "Leaves", path: "/admin/hr/leaves", icon: "leaves", requiredPermission: "MANAGE_HR" },
    { label: "HR Policies", path: "/admin/hr/settings", icon: "policies", requiredPermission: "MANAGE_HR" },

    { label: "Reports", section: true, icon: "", allowedRoles: ["ACCOUNTING"] },
    { label: "Analytics", path: "/admin/reports/analytics", icon: "analytics", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },
    { label: "GST Report", path: "/admin/reports/gst", icon: "reports", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },
    { label: "Financial Report", path: "/admin/reports/financial", icon: "folio", requiredPermission: "VIEW_FINANCIALS", allowedRoles: ["ACCOUNTING"] },

    { label: "Administration", section: true, icon: "" },
    { label: "Staff & Users", path: "/admin/users", icon: "users", requiredPermission: "MANAGE_STAFF" },
    { label: "Property Settings", path: "/admin/settings", icon: "settings", requiredPermission: "MANAGE_SETTINGS" },
    { label: "Role Management", path: "/admin/settings/roles", icon: "roles", requiredPermission: "MANAGE_SETTINGS" },

    { label: "Platform", section: true, icon: "" },
    { label: "Monitoring", path: "/admin/monitoring", icon: "monitoring", requiredPermission: "MANAGE_SETTINGS" },
    { label: "Hotel Onboarding", path: "/admin/onboarding", icon: "onboarding", requiredPermission: "MANAGE_SETTINGS" },
    { label: "Smart Access", path: "/admin/smart-access", icon: "access", requiredPermission: "MANAGE_SETTINGS" },
];

type UserContext = {
    name?: string;
    email?: string;
    roles?: { role: { name: string } }[];
    permissions?: string[];
    hotel?: { name?: string } | null;
};

function IdleWarningModal({ countdown, onStayActive, onLogout }: {
    countdown: number;
    onStayActive: () => void;
    onLogout: () => void;
}) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                background: "var(--bg-secondary)", borderRadius: "16px", padding: "2rem",
                width: 360, textAlign: "center", border: "1px solid var(--border-color)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⏱️</div>
                <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem" }}>Session Expiring</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
                    You&apos;ve been inactive. Logging out in <strong style={{ color: "#ef4444", fontSize: "1.1rem" }}>{countdown}s</strong>
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button onClick={onLogout} style={{
                        padding: "0.6rem 1.2rem", borderRadius: "8px",
                        border: "1px solid var(--border-color)", background: "none",
                        color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.875rem",
                    }}>Logout Now</button>
                    <button onClick={onStayActive} style={{
                        padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none",
                        background: "var(--accent-gold)", color: "#000",
                        fontWeight: 700, cursor: "pointer", fontSize: "0.875rem",
                    }}>Stay Logged In</button>
                </div>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { showWarning, countdown, logout } = useIdleTimeout({ timeoutMinutes: 15 });
    const [userContext, setUserContext] = useState<UserContext | null>(null);

    useEffect(() => {
        fetch("/api/auth/me").then(r => r.json()).then(d => {
            if (d.user) setUserContext(d.user);
        });
    }, []);

    const handleStayActive = () => {
        // A click event resets the idle timer automatically via event listener
        window.dispatchEvent(new MouseEvent("mousemove"));
    };

    const userRoles = userContext?.roles?.map((assignment) => assignment.role.name) || [];
    const isSuperAdmin = userRoles.some((role) => ["SUPER_ADMIN", "OWNER"].includes(role));

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-overlay)" }}>
            {showWarning && (
                <IdleWarningModal
                    countdown={countdown}
                    onStayActive={handleStayActive}
                    onLogout={logout}
                />
            )}

            <Sidebar
                brand="StayOS"
                brandSub="Hotel operations"
                navItems={navItems}
                userRole={userContext?.roles?.map((assignment) => assignment.role.name).join(", ") || "Loading..."}
                userRoles={userRoles}
                userEmail={userContext?.email}
                userPermissions={userContext?.permissions || []}
                isSuperAdmin={isSuperAdmin}
            />

            <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <header style={{
                    padding: "0 1.5rem 0 4.5rem",
                    minHeight: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    gap: "1rem",
                    backdropFilter: "blur(10px)",
                }}>
                    <div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Active property</div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>{userContext?.hotel?.name || (isSuperAdmin ? "All properties" : "Hotel workspace")}</div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {pathname.split("/").filter(Boolean).map((p, i, arr) => (
                            <span key={p}>
                                {i > 0 && " / "}
                                <span style={{ color: i === arr.length - 1 ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "capitalize" }}>{p.replace(/-/g, " ")}</span>
                            </span>
                        ))}
                    </div>
                </header>
                {isSuperAdmin && <DemoModeBanner />}
                <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                    {children}
                </div>
            </main>

            {isSuperAdmin && <ThemeCustomizer isSuperAdmin />}
            <FeedbackWidget />
        </div>
    );
}
