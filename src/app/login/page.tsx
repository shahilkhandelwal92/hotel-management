"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                setLoading(false);
                return;
            }

            // Route based on roles array
            const roles = data.user.roles || [];
            if (roles.includes("OWNER") || roles.includes("SUPER_ADMIN")) {
                router.push("/admin/dashboard");
            } else if (roles.includes("STAFF")) {
                router.push("/staff/dashboard");
            } else if (roles.includes("KITCHEN")) {
                router.push("/restaurant/orders");
            } else if (roles.includes("CORPORATE")) {
                router.push("/corporate");
            } else {
                router.push("/guest");
            }

        } catch (err) {
            setError("Network error occurred.");
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center' }}>
                <LanguageSwitcher />
                <ThemeToggle />
            </div>
            <div className={`glass-panel animate-fade-in ${styles.loginCard}`} style={{ maxWidth: '400px', width: '100%', padding: '3rem' }}>
                <div className={styles.header}>
                    <h2>Welcome Back</h2>
                    <p>Sign in to your Hotel Management account</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>

                    {error && <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            placeholder="admin@grandimperial.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" disabled={loading} className={`btn-primary ${styles.submitBtn}`} style={{ minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{loading ? 'Authenticating...' : 'Sign In'}</span>
                    </button>

                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                            Public Portals
                            <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                        </div>
                        <button type="button" onClick={() => router.push('/book-event')} style={{ width: '100%', minHeight: '60px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', gap: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🎉</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Plan Your Event</div>
                            </div>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
