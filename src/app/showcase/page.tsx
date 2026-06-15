"use client";

import React from "react";
import {
    ShieldCheck,
    Smartphone,
    CreditCard,
    Zap,
    Users,
    Globe,
    Database,
    LayoutDashboard,
    ArrowRight,
    PlayCircle
} from "lucide-react";
import styles from "./showcase.module.css";
import { useRouter } from "next/navigation";

const features = [
    {
        title: "Smart Access Core",
        desc: "Vendor-agnostic hardware abstraction layer supporting Mobile Keys, QR, and RFID.",
        icon: <ShieldCheck className={styles.iconGold} />,
        category: "Security",
        size: "large"
    },
    {
        title: "Financial Integrity",
        desc: "Automated Night Audit, GST-compliant invoicing, and guest folio ledgers.",
        icon: <CreditCard className={styles.iconBlue} />,
        category: "Accounting",
        size: "medium"
    },
    {
        title: "Multi-Tenant Isolation",
        desc: "Enterprise-grade data security with JWT-injected tenant headers and middleware guards.",
        icon: <Database className={styles.iconGold} />,
        category: "Architecture",
        size: "small"
    },
    {
        title: "POS & Inventory",
        desc: "Real-time stock deduction from restaurant orders with low-stock alerts.",
        icon: <Zap className={styles.iconBlue} />,
        category: "Operations",
        size: "small"
    },
    {
        title: "Role-Based Portals",
        desc: "Tailored experiences for Guests, Staff, Housekeeping, and Corporate owners.",
        icon: <Users className={styles.iconGold} />,
        category: "UX",
        size: "medium"
    },
    {
        title: "Global Reach",
        desc: "Built-in dynamic translation and multi-currency support for international hotels.",
        icon: <Globe className={styles.iconBlue} />,
        category: "Localization",
        size: "small"
    }
];

export default function ShowcasePage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            {/* Hero Section */}
            <header className={styles.hero}>
                <div className="animate-fade-in">
                    <div className={styles.badge}>
                        <span>Introducing V2.0</span>
                    </div>
                    <h1 className="text-gradient">The Future of Hospitality</h1>
                    <p className={styles.heroSubtitle}>
                        A premium, feature-rich hotel management ecosystem designed for
                        unmatched operational excellence and guest delight.
                    </p>
                    <div className={styles.heroCta}>
                        <button className="btn-primary" onClick={() => router.push('/presentation')}>
                            Watch Presentation <PlayCircle size={18} style={{ marginLeft: '8px' }} />
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => router.push('/developer')}>
                            Developer Hub <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Bento Grid */}
            <section className={styles.grid}>
                {features.map((f, i) => (
                    <div
                        key={i}
                        className={`${styles.card} glass-panel animate-fade-in`}
                        data-size={f.size}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}>{f.icon}</div>
                            <span className={styles.category}>{f.category}</span>
                        </div>
                        <h3 className={styles.cardTitle}>{f.title}</h3>
                        <p className={styles.cardDesc}>{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* Trust Section */}
            <footer className={styles.footer}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>Ready to transform your hotel?</h3>
                    <p>Join the elite hotels already using our platform.</p>
                    <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/login')}>
                        Get Started Now
                    </button>
                </div>
            </footer>
        </div>
    );
}
