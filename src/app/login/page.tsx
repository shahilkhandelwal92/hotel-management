"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    ChefHat,
    Eye,
    EyeOff,
    Hotel,
    KeyRound,
    ShieldCheck,
    Sparkles,
    UserRound,
    WalletCards,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import styles from "./login.module.css";

const demoAccounts = [
    { label: "Chain admin", email: "client.admin@demo.com", icon: ShieldCheck },
    { label: "Hotel admin", email: "hotel.admin@demo.com", icon: Hotel },
    { label: "Hotel staff", email: "staff@demo.com", icon: UserRound },
    { label: "Restaurant", email: "kitchen@demo.com", icon: ChefHat },
    { label: "Corporate", email: "corporate@demo.com", icon: BriefcaseBusiness },
    { label: "Accounts", email: "accounting@demo.com", icon: WalletCards },
];

function getHomeForRoles(roles: string[]) {
    if (roles.some((role) => ["SUPER_ADMIN", "OWNER"].includes(role))) return "/admin/dashboard";
    if (roles.includes("ACCOUNTING")) return "/admin/reports/analytics";
    if (roles.includes("HOTEL_ADMIN")) return "/admin/reservations";
    if (roles.some((role) => ["KITCHEN", "RESTAURANT"].includes(role))) return "/restaurant/orders";
    if (roles.some((role) => ["STAFF", "HOUSEKEEPING", "FRONT_DESK"].includes(role))) return "/staff/dashboard";
    if (roles.includes("CORPORATE")) return "/corporate/dashboard";
    return "/guest";
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const showDemoAccounts = process.env.NODE_ENV !== "production";

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "We could not sign you in.");
                return;
            }

            router.replace(getHomeForRoles(data.user.roles || []));
            router.refresh();
        } catch {
            setError("The server is not reachable. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fillDemoAccount = (accountEmail: string) => {
        setEmail(accountEmail);
        setPassword("Client@2026");
        setError("");
    };

    return (
        <main className={styles.page}>
            <div className={styles.topActions}>
                <LanguageSwitcher />
                <ThemeToggle />
            </div>

            <section className={styles.storyPanel}>
                <div className={styles.brand}>
                    <span className={styles.brandMark}><Building2 size={24} /></span>
                    <span>StayOS</span>
                </div>

                <div className={styles.storyContent}>
                    <div className={styles.eyebrow}><Sparkles size={15} /> One workspace. Every stay.</div>
                    <h1>Hospitality operations that feel effortless.</h1>
                    <p>
                        Run every property, delight every guest, and give every team member exactly
                        the tools they need.
                    </p>
                    <div className={styles.highlights}>
                        <div><span>01</span> Multi-property command center</div>
                        <div><span>02</span> Guest ordering and self checkout</div>
                        <div><span>03</span> People, payroll, POS, and finance</div>
                    </div>
                </div>

                <div className={styles.liveCard}>
                    <div>
                        <span className={styles.liveDot} />
                        Operations live
                    </div>
                    <strong>One secure sign-in for every role</strong>
                </div>
            </section>

            <section className={styles.formPanel}>
                <div className={styles.formWrap}>
                    <div className={styles.formHeader}>
                        <div className={styles.mobileBrand}><Building2 size={21} /> StayOS</div>
                        <div className={styles.eyebrow}>Secure workspace</div>
                        <h2>Welcome back</h2>
                        <p>Sign in to continue to your assigned hotel workspace.</p>
                    </div>

                    <form onSubmit={handleLogin} className={styles.form}>
                        {error && <div className={styles.error} role="alert">{error}</div>}

                        <label className={styles.fieldGroup}>
                            <span>Email address</span>
                            <span className={styles.inputWrap}>
                                <UserRound size={18} />
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@hotel.com"
                                />
                            </span>
                        </label>

                        <label className={styles.fieldGroup}>
                            <span>Password</span>
                            <span className={styles.inputWrap}>
                                <KeyRound size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword((value) => !value)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </span>
                        </label>

                        <button type="submit" disabled={loading} className={styles.submit}>
                            <span>{loading ? "Signing you in..." : "Sign in"}</span>
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {showDemoAccounts && (
                        <div className={styles.demoBlock}>
                            <div className={styles.demoTitle}>Demo workspaces</div>
                            <div className={styles.demoGrid}>
                                {demoAccounts.map(({ label, email: accountEmail, icon: Icon }) => (
                                    <button key={accountEmail} onClick={() => fillDemoAccount(accountEmail)} type="button">
                                        <Icon size={16} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                            <p>Password is prefilled for local demo accounts.</p>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
