"use client";

import React from "react";
import {
    ChevronLeft,
    Database,
    ShieldAlert,
    GitMerge,
    Workflow,
    ArrowRight,
    Search,
    FileJson,
    Server,
    Users,
    Terminal,
    GitBranch,
    ExternalLink,
    CheckCircle,
    Lightbulb,
    Zap,
    Repeat,
    Lock
} from "lucide-react";
import styles from "./blueprint.module.css";
import { useRouter } from "next/navigation";

export default function DeveloperBlueprintDashboard() {
    const [hoveredModule, setHoveredModule] = React.useState<string | null>(null);
    const router = useRouter();

    const dbModules = [
        { id: "pms", name: "PMS (Property Management)", desc: "Reservation, Room, Folio", color: "var(--success)" },
        { id: "iam", name: "IAM & Security", desc: "User, Role, Permission", color: "var(--accent-blue)" },
        { id: "billing", name: "Financials & GST", desc: "Invoice, TaxConfig, NightAudit", color: "var(--error)" },
        { id: "ops", name: "Operations & Access", desc: "Housekeeping, SmartKey", color: "var(--accent-gold)" }
    ];

    const capabilities = [
        {
            module: "PMS Engine",
            icon: <Database size={20} />,
            actions: ["Dynamic Rate Multipliers", "Overbooking Prevention", "Group Booking Aggregation"]
        },
        {
            module: "Financial Hub",
            icon: <Zap size={20} />,
            actions: ["B2B GST Generation", "Night Audit Locking", "Folio Splitting & Settlement"]
        },
        {
            module: "Smart Access",
            icon: <Lock size={20} />,
            actions: ["Mobile Key Provisioning", "Geofenced Check-in", "Hardware Audit Logs"]
        },
        {
            module: "Operations",
            icon: <Repeat size={20} />,
            actions: ["Automated Task Dispatch", "Inventory Alert System", "Shift-based Access Routing"]
        }
    ];

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => router.push('/developer')}>
                <ChevronLeft size={20} /> Back to Hub
            </button>

            <header className={styles.header}>
                <div className={styles.badge}><Database size={14} /> System Blueprint</div>
                <h1 className="text-gradient">Architectural Source of Truth</h1>
                <p className={styles.subtitle}>
                    A living document of the project's data topology, security layers, and operational flows.
                </p>
            </header>

            <div className={styles.blueprintGrid}>
                <main className={styles.mainSection}>
                    {/* Multi-dimensional Interconnectivity */}
                    <div className={`${styles.card} glass-panel`}>
                        <div className={styles.cardHeader}>
                            <GitMerge className="icon-gold" />
                            <h3>The Interconnectivity Engine (Ripple Effects)</h3>
                        </div>
                        <div className={`${styles.flowContainer} ${styles.interconnectMap}`}>
                            <svg viewBox="0 0 800 400" className={styles.svgDiagram}>
                                {/* Nodes */}
                                <g onMouseEnter={() => setHoveredModule("pms")} onMouseLeave={() => setHoveredModule(null)} className={styles.diagramNode}>
                                    <rect x="350" y="50" width="100" height="40" rx="8" fill="var(--success)" fillOpacity={hoveredModule === "pms" ? "0.4" : "0.1"} stroke="var(--success)" strokeWidth="2" />
                                    <text x="400" y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">PMS Engine</text>
                                </g>

                                <g onMouseEnter={() => setHoveredModule("billing")} onMouseLeave={() => setHoveredModule(null)} className={styles.diagramNode}>
                                    <rect x="550" y="200" width="120" height="40" rx="8" fill="var(--error)" fillOpacity={hoveredModule === "billing" ? "0.4" : "0.1"} stroke="var(--error)" strokeWidth="2" />
                                    <text x="610" y="225" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">GST Billing</text>
                                </g>

                                <g onMouseEnter={() => setHoveredModule("ops")} onMouseLeave={() => setHoveredModule(null)} className={styles.diagramNode}>
                                    <rect x="150" y="200" width="120" height="40" rx="8" fill="var(--accent-gold)" fillOpacity={hoveredModule === "ops" ? "0.4" : "0.1"} stroke="var(--accent-gold)" strokeWidth="2" />
                                    <text x="210" y="225" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Smart Access</text>
                                </g>

                                <g onMouseEnter={() => setHoveredModule("pos")} onMouseLeave={() => setHoveredModule(null)} className={styles.diagramNode}>
                                    <rect x="350" y="320" width="100" height="40" rx="8" fill="var(--accent-blue)" fillOpacity={hoveredModule === "pos" ? "0.4" : "0.1"} stroke="var(--accent-blue)" strokeWidth="2" />
                                    <text x="400" y="345" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">POS Hub</text>
                                </g>

                                {/* Connection Lines - Static & Animated */}
                                <path d="M 400 90 L 400 320" className={`${styles.connectionLine} ${hoveredModule === 'pms' || hoveredModule === 'pos' ? styles.active : ""}`} markerEnd="url(#arrowhead)" />
                                <path d="M 450 70 Q 610 70 610 200" className={`${styles.connectionLine} ${hoveredModule === 'pms' || hoveredModule === 'billing' ? styles.active : ""}`} markerEnd="url(#arrowhead)" />
                                <path d="M 350 70 Q 210 70 210 200" className={`${styles.connectionLine} ${hoveredModule === 'pms' || hoveredModule === 'ops' ? styles.active : ""}`} markerEnd="url(#arrowhead)" />
                                <path d="M 400 320 Q 610 320 610 240" className={`${styles.connectionLine} ${hoveredModule === 'pos' || hoveredModule === 'billing' ? styles.active : ""}`} markerEnd="url(#arrowhead)" />

                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
                                    </marker>
                                </defs>
                            </svg>
                            <p className={styles.smallText} style={{ textAlign: 'center', marginTop: '1rem' }}>
                                Hover over a module to see its **Ripple Effect** dependencies.
                            </p>
                        </div>
                    </div>

                    {/* Feature Capability Matrix */}
                    <div className={`${styles.card} glass-panel`}>
                        <div className={styles.cardHeader}>
                            <Zap className="icon-blue" />
                            <h3>Feature Capability Matrix</h3>
                        </div>
                        <div className={styles.capabilityGrid}>
                            {capabilities.map((cap, i) => (
                                <div key={i} className={styles.capabilityCard}>
                                    <div className={styles.capHeader}>
                                        <div className={styles.nodeIcon}>{cap.icon}</div>
                                        <h4>{cap.module}</h4>
                                    </div>
                                    <ul className={styles.capList}>
                                        {cap.actions.map((act, j) => (
                                            <li key={j} className={styles.capItem}>{act}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Operational Flow */}
                    <div className={`${styles.card} glass-panel`}>
                        <div className={styles.cardHeader}>
                            <Workflow className="icon-blue" />
                            <h3>The Unified Guest Journey Flow</h3>
                        </div>
                        <div className={styles.flowSteps}>
                            {[
                                { step: "Inquiry/Booking", icon: <Search size={18} />, color: "var(--accent-blue)" },
                                { step: "Identity & Check-in", icon: <ShieldAlert size={18} />, color: "var(--accent-gold)" },
                                { step: "Digital Access", icon: <Server size={18} />, color: "var(--success)" },
                                { step: "Financial Closure", icon: <FileJson size={18} />, color: "var(--error)" }
                            ].map((f, i) => (
                                <React.Fragment key={i}>
                                    <div className={styles.flowNode} style={{ borderColor: f.color }}>
                                        <div className={styles.nodeIcon} style={{ background: f.color }}>{f.icon}</div>
                                        <span>{f.step}</span>
                                    </div>
                                    {i < 3 && <ArrowRight className={styles.flowArrow} size={20} />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </main>

                <aside className={styles.sidePanel}>
                    {/* Schema Stats */}
                    <div className={`${styles.card} glass-panel`}>
                        <div className={styles.cardHeader}>
                            <Users className="icon-gold" />
                            <h3>Schema Complexity</h3>
                        </div>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>1,300+</span>
                                <span className={styles.statLabel}>Lines of Prisma</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>42</span>
                                <span className={styles.statLabel}>Core Models</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>~150</span>
                                <span className={styles.statLabel}>API Endpoints</span>
                            </div>
                        </div>
                    </div>

                    {/* Data Modules */}
                    <div className={`${styles.card} glass-panel`}>
                        <div className={styles.cardHeader}>
                            <Database className="icon-blue" />
                            <h3>Data Modules</h3>
                        </div>
                        <ul className={styles.moduleList}>
                            {dbModules.map((m, i) => (
                                <li key={i} className={styles.moduleItem} onMouseEnter={() => setHoveredModule(m.id)} onMouseLeave={() => setHoveredModule(null)}>
                                    <span className={styles.moduleName} style={{ color: m.color }}>{m.name}</span>
                                    <span className={styles.moduleDesc}>{m.desc}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div >

            <footer className={styles.footer}>
                <p>Engineered for persistence & scalability. Handled by the Evolution Core Guild.</p>
            </footer>
        </div >
    );
}
