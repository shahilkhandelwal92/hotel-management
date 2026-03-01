"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar, NavItem } from "@/components/Sidebar";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import styles from "./admin.module.css";

const navItems: NavItem[] = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    { label: "─ Events", section: true, icon: "" },
    { label: "Corporate Events", path: "/admin/events", icon: "🎪" },
    { label: "Event Scanner", path: "/admin/events/scanner", icon: "📷" },
    { label: "Event Venues", path: "/admin/venues", icon: "🏟️" },
    { label: "─ Operations", section: true, icon: "" },
    { label: "Inventory Map", path: "/admin/inventory", icon: "🗺️" },
    { label: "Staff Roles & Audit", path: "/admin/users", icon: "👥" },
    { label: "─ HR", section: true, icon: "" },
    { label: "Attendance", path: "/admin/hr/attendance", icon: "🕐" },
    { label: "Leaves", path: "/admin/hr/leaves", icon: "🌿" },
    { label: "HR Policies", path: "/admin/hr/settings", icon: "📋" },
    { label: "─ Reports", section: true, icon: "" },
    { label: "GST Report", path: "/admin/reports/gst", icon: "📄" },
    { label: "Financial Report", path: "/admin/reports/financial", icon: "💰" },
    { label: "─ Settings", section: true, icon: "" },
    { label: "Property Settings", path: "/admin/settings", icon: "⚙️" },
];

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

    const handleStayActive = () => {
        // A click event resets the idle timer automatically via event listener
        window.dispatchEvent(new MouseEvent("mousemove"));
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
            {showWarning && (
                <IdleWarningModal
                    countdown={countdown}
                    onStayActive={handleStayActive}
                    onLogout={logout}
                />
            )}

            <Sidebar
                brand="Grand Imperial"
                brandSub="Hotel Admin"
                navItems={navItems}
                userRole="Hotel Super Admin"
            />

            <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <header style={{
                    padding: "0 1.5rem",
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    gap: "1rem",
                    backdropFilter: "blur(10px)",
                }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {pathname.split("/").filter(Boolean).map((p, i, arr) => (
                            <span key={p}>
                                {i > 0 && " / "}
                                <span style={{ color: i === arr.length - 1 ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "capitalize" }}>{p.replace(/-/g, " ")}</span>
                            </span>
                        ))}
                    </div>
                </header>
                <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                    {children}
                </div>
            </main>

            <ThemeCustomizer isSuperAdmin={true} />
        </div>
    );
}
