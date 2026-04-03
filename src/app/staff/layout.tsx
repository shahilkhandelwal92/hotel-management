"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

interface User {
    name: string;
    roles: { role: { name: string } }[];
}

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    useEffect(() => {
        fetch("/api/auth/me")
            .then(r => r.json())
            .then(d => { if (d.user) setUser(d.user); });
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <header style={{
                height: '70px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(10px)'
            }}>
                <Link href="/staff/dashboard" style={{ textDecoration: 'none', color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px' }}>
                    GRAND IMPERIAL <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>STAFF</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <ThemeToggle />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{user?.name || "Authenticating..."}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{user?.roles?.[0]?.role?.name || "Wait..."}</div>
                        </div>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--accent-gold), #d4af37)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800
                        }}>
                            {user?.name?.[0] || "?"}
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: "none",
                                border: "1px solid var(--border-color)",
                                color: "var(--text-secondary)",
                                padding: "0.5rem 1rem",
                                borderRadius: "10px",
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ padding: '2rem' }}>
                {children}
            </main>
        </div>
    );
}
