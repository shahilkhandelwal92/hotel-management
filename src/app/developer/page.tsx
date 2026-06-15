"use client";

import React from "react";
import {
    Code2,
    Layers,
    ShieldCheck,
    Cpu,
    Terminal,
    GitBranch,
    ExternalLink,
    CheckCircle,
    Lightbulb
} from "lucide-react";
import styles from "./developer.module.css";
import { useRouter } from "next/navigation";

const stack = [
    { tech: "Next.js 15", desc: "App Router, SSR, and Turbopack for performance." },
    { tech: "Prisma ORM", desc: "Type-safe database interaction with Neon PostgreSQL." },
    { tech: "Jose / JWT", desc: "Stateless authentication with custom middleware guards." },
    { tech: "Custom CSS", desc: "Vanila CSS with premium glassmorphism variables." }
];

export default function DeveloperHub() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.badge}><Code2 size={14} /> Developer Hub</div>
                    <h1 className="text-gradient">Enablement & Architecture</h1>
                    <p className={styles.subtitle}>
                        Welcome to the internal engineering guild. This platform is engineered for
                        scalability, security, and developer joy.
                    </p>
                </div>
            </header>

            <section className={styles.contentGrid}>
                {/* Tech Stack */}
                <div className={`${styles.mainCard} glass-panel`}>
                    <div className={styles.cardHeader}>
                        <Layers className={styles.iconGold} />
                        <h3>Modern Tech Stack</h3>
                    </div>
                    <div className={styles.stackGrid}>
                        {stack.map((s, i) => (
                            <div key={i} className={styles.stackItem}>
                                <CheckCircle size={16} className={styles.successIcon} />
                                <div>
                                    <strong>{s.tech}</strong>
                                    <p>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* What Can You Achieve */}
                <div className={`${styles.mainCard} glass-panel`}>
                    <div className={styles.cardHeader}>
                        <Lightbulb className={styles.iconBlue} />
                        <h3>What You Can Achieve</h3>
                    </div>
                    <ul className={styles.achieveList}>
                        <li>
                            <strong>White-labeling:</strong> Customize themes and logos for 100+ hotel brands via centralized variables.
                        </li>
                        <li>
                            <strong>Vendor Aggregation:</strong> Bridge real-world hardware (Locks, POS) with simple Hardware Abstraction Layers.
                        </li>
                        <li>
                            <strong>SaaS Scaling:</strong> Deploy multi-tenant isolation that handles thousands of concurrent reservations.
                        </li>
                        <li>
                            <strong>Financial Accuracy:</strong> Maintain 100% audit integrity with automated ledger reconciliation.
                        </li>
                    </ul>
                </div>

                {/* Security & Ops */}
                <div className={`${styles.sideCard} glass-panel`}>
                    <div className={styles.cardHeader}>
                        <ShieldCheck className={styles.iconGold} />
                        <h3>Security First</h3>
                    </div>
                    <p className={styles.smallText}>
                        Our custom middleware injects verified <code>x-hotel-id</code> headers from JWT,
                        eliminating client-side header forgery risks.
                    </p>
                    <div className={styles.badgeList}>
                        <span className={styles.miniBadge}>JWT</span>
                        <span className={styles.miniBadge}>IP Blacklisting</span>
                        <span className={styles.miniBadge}>Rate Limiting</span>
                    </div>
                </div>

                {/* Dev Tools */}
                <div className={`${styles.sideCard} glass-panel`}>
                    <div className={styles.cardHeader}>
                        <Terminal className={styles.iconBlue} />
                        <h3>Internal Tools</h3>
                    </div>
                    <div className={styles.toolLink}>
                        <code>npx prisma studio</code> <ExternalLink size={14} />
                    </div>
                    <div className={styles.toolLink}>
                        <code>npm run dev</code> <ExternalLink size={14} />
                    </div>
                    <button className={styles.fullBtn} onClick={() => router.push('/developer/blueprint')} style={{ marginBottom: '1rem', background: 'var(--accent-gold)', color: 'black' }}>
                        View System Blueprint
                    </button>
                    <button className={styles.fullBtn} onClick={() => router.push('/showcase')}>
                        Explore Showcase
                    </button>
                </div>
            </section>

            <footer className={styles.footer}>
                <p>© 2026 Hotel Management System • Built for Developers by Developers</p>
            </footer>
        </div>
    );
}
