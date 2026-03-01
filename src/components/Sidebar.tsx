"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface NavItem {
    label: string;
    path?: string;
    icon: string;
    section?: boolean;
}

interface SidebarProps {
    brand: string;
    brandSub?: string;
    navItems: NavItem[];
    userRole: string;
    userEmail?: string;
    accentColor?: string;
}

export function Sidebar({ brand, brandSub, navItems, userRole, userEmail }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <aside style={{
            width: collapsed ? 64 : 220,
            minHeight: "100vh",
            background: "var(--sidebar-bg, #1a1612)",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            zIndex: 10,
            borderRight: "1px solid rgba(201,169,110,0.15)",
        }}>
            {/* Brand */}
            <div style={{
                padding: collapsed ? "1.2rem 0" : "1.2rem 1rem",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                minHeight: 64,
            }}>
                {!collapsed && (
                    <div>
                        <div style={{ color: "var(--accent-gold, #c9a96e)", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}>{brand}</div>
                        {brandSub && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginTop: "0.15rem" }}>{brandSub}</div>}
                    </div>
                )}
                {collapsed && <span style={{ fontSize: "1.2rem" }}>🏨</span>}
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: "absolute",
                    top: "1rem",
                    right: collapsed ? "50%" : "0.5rem",
                    transform: collapsed ? "translateX(50%)" : "none",
                    width: 24, height: 24,
                    borderRadius: "50%",
                    background: "var(--accent-gold, #c9a96e)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.6rem",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    transition: "all 0.25s ease",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
            >
                {collapsed ? "▶" : "◀"}
            </button>

            {/* Nav Items */}
            <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto", overflowX: "hidden" }}>
                {navItems.map((item, i) => {
                    if (item.section) {
                        return (
                            <div key={i} style={{
                                padding: collapsed ? "0.75rem 0" : "0.75rem 1rem 0.3rem",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "rgba(255,255,255,0.25)",
                                display: collapsed ? "flex" : "block",
                                justifyContent: "center",
                            }}>
                                {collapsed ? "—" : item.label.replace(/^[─\s]+|[─\s]+$/g, "")}
                            </div>
                        );
                    }

                    if (!item.path) return null;
                    const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            title={collapsed ? item.label : undefined}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: collapsed ? "0.65rem 0" : "0.65rem 1rem",
                                justifyContent: collapsed ? "center" : "flex-start",
                                color: isActive ? "var(--accent-gold, #c9a96e)" : "rgba(255,255,255,0.55)",
                                background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
                                borderRight: isActive ? "3px solid var(--accent-gold, #c9a96e)" : "3px solid transparent",
                                textDecoration: "none",
                                fontSize: "0.82rem",
                                fontWeight: isActive ? 600 : 400,
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                borderRadius: collapsed ? "0" : "0",
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
                        >
                            <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
                            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: collapsed ? "1rem 0" : "1rem",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: collapsed ? "center" : "flex-start",
                gap: "0.5rem",
            }}>
                {!collapsed && (
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                        {userRole}
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : "0.5rem", justifyContent: collapsed ? "center" : "space-between", width: "100%" }}>
                    <ThemeToggle />
                    {!collapsed && (
                        <button onClick={handleLogout} style={{
                            background: "none", border: "1px solid rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.4)", cursor: "pointer",
                            fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "6px",
                            transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.borderColor = "#ef4444"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                        >
                            Logout
                        </button>
                    )}
                    {collapsed && (
                        <button onClick={handleLogout} title="Logout" style={{
                            background: "none", border: "none", color: "rgba(255,255,255,0.35)",
                            cursor: "pointer", fontSize: "1rem",
                        }}>🚪</button>
                    )}
                </div>
            </div>
        </aside>
    );
}
