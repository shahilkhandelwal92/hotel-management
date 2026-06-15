"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Activity, AlertTriangle, CheckCircle, XCircle, Moon, ShoppingCart,
    Users, Package, TrendingDown, Shield, RefreshCw, Clock,
} from "lucide-react";

interface HealthData {
    hotel: string;
    generatedAt: string;
    kpis: {
        todayCheckIns: number;
        todayCheckOuts: number;
        openFolios: number;
        unpaidOverdueInvoices: number;
        failedPayments: number;
        pendingOvertimeApprovals: number;
        unapprovedPayrollCount: number;
        reservationsWithoutRoom: number;
        negativeFolioCount: number;
    };
    alerts: {
        nightAuditStatus: string;
        nightAuditDayClosed: boolean;
        lowStockCount: number;
        lowStockAlerts: { itemName: string; quantity: number; minAlert: number; unit: string; severity: string }[];
        securityAlerts: { action: string; module: string; entityId: string; createdAt: string; ipAddress: string }[];
    };
    rooms: Record<string, number>;
    smartAccess: {
        activeCredentials: number;
        expiringToday: number;
        deniedEntries24h: number;
        staffLateCheckIns: number;
    };
}

function KpiCard({ label, value, icon, color, alert }: { label: string; value: number | string; icon: React.ReactNode; color: string; alert?: boolean }) {
    return (
        <div style={{
            background: "var(--surface-2)", border: `1.5px solid ${alert && Number(value) > 0 ? color : "var(--border)"}`,
            borderRadius: 12, padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem",
            transition: "border-color 0.3s",
        }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: alert && Number(value) > 0 ? color : "var(--text-primary)", lineHeight: 1 }}>
                    {value}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
            </div>
        </div>
    );
}

export default function MonitoringPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/health/dashboard")
            .then((r) => r.json())
            .then((d) => { setData(d); setLastRefresh(new Date()); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 60s
    useEffect(() => {
        if (!autoRefresh) return;
        const t = setInterval(load, 60_000);
        return () => clearInterval(t);
    }, [autoRefresh, load]);

    if (!data && loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading health dashboard…</div>
        </div>
    );

    if (!data) return null;
    const { kpis, alerts, rooms } = data;
    const totalRooms = Object.values(rooms).reduce((a: number, b: number) => a + b, 0);

    return (
        <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                        <Activity size={22} style={{ verticalAlign: "middle", marginRight: 8, color: "#6366f1" }} />
                        Operations Monitor
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Last updated: {lastRefresh.toLocaleTimeString("en-IN")}
                        {autoRefresh && <span style={{ marginLeft: 8, color: "#22c55e", fontSize: "0.8rem" }}>● Auto-refresh ON</span>}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                        onClick={() => setAutoRefresh((p) => !p)}
                        style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid var(--border)", background: autoRefresh ? "rgba(99,102,241,0.1)" : "var(--surface-2)", color: autoRefresh ? "#6366f1" : "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                        {autoRefresh ? "⏸ Pause" : "▶ Resume"}
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
                    </button>
                </div>
            </div>

            {/* Night Audit Banner */}
            <div style={{
                padding: "0.85rem 1.25rem", borderRadius: 10, marginBottom: "1.5rem",
                background: alerts.nightAuditDayClosed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1.5px solid ${alerts.nightAuditDayClosed ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
                <Moon size={18} style={{ color: alerts.nightAuditDayClosed ? "#22c55e" : "#ef4444" }} />
                <strong style={{ color: alerts.nightAuditDayClosed ? "#166534" : "#dc2626" }}>
                    Night Audit: {alerts.nightAuditStatus}
                </strong>
                {!alerts.nightAuditDayClosed && (
                    <a href="/admin/night-audit" style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#ef4444", fontWeight: 600, textDecoration: "none" }}>
                        Close Today's Audit →
                    </a>
                )}
            </div>

            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <KpiCard label="Today's Check-Ins" value={kpis.todayCheckIns} icon={<Users size={20} />} color="#6366f1" />
                <KpiCard label="Today's Check-Outs" value={kpis.todayCheckOuts} icon={<Users size={20} />} color="#8b5cf6" />
                <KpiCard label="Open Folios" value={kpis.openFolios} icon={<TrendingDown size={20} />} color="#f59e0b" />
                <KpiCard label="Overdue Invoices" value={kpis.unpaidOverdueInvoices} icon={<AlertTriangle size={20} />} color="#ef4444" alert />
                <KpiCard label="Failed Payments" value={kpis.failedPayments} icon={<XCircle size={20} />} color="#ef4444" alert />
                <KpiCard label="Pending OT Approvals" value={kpis.pendingOvertimeApprovals} icon={<Clock size={20} />} color="#f59e0b" alert />
                <KpiCard label="Payroll Unapproved" value={kpis.unapprovedPayrollCount} icon={<Users size={20} />} color="#f59e0b" alert />
                <KpiCard label="No Room Assigned" value={kpis.reservationsWithoutRoom} icon={<AlertTriangle size={20} />} color="#ef4444" alert />
                <KpiCard label="Negative Folios" value={kpis.negativeFolioCount} icon={<TrendingDown size={20} />} color="#ef4444" alert />
            </div>

            {/* Smart Access Grid */}
            <h3 style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                🔐 Smart Access & Attendance
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <KpiCard label="Active Keys" value={data.smartAccess.activeCredentials} icon={<Shield size={20} />} color="#10b981" />
                <KpiCard label="Keys Expiring (24h)" value={data.smartAccess.expiringToday} icon={<Clock size={20} />} color="#f59e0b" alert />
                <KpiCard label="Denied Entries (24h)" value={data.smartAccess.deniedEntries24h} icon={<XCircle size={20} />} color="#ef4444" alert />
                <KpiCard label="Staff Late Arrivals" value={data.smartAccess.staffLateCheckIns} icon={<Users size={20} />} color="#6366f1" alert />
            </div>

            {/* Two-column bottom row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                {/* Room Status */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
                    <h3 style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        🛏 Room Status ({totalRooms} total)
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {Object.entries(rooms).map(([status, count]) => (
                            <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        background: status === "Available" ? "#22c55e" : status === "Occupied" ? "#6366f1" : status === "Dirty" ? "#f59e0b" : "#ef4444",
                                    }} />
                                    <span style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>{status}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ height: 6, width: `${Math.round((count / totalRooms) * 80)}px`, background: status === "Available" ? "#22c55e" : status === "Occupied" ? "#6366f1" : status === "Dirty" ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                                    <span style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: "0.85rem", minWidth: 24, textAlign: "right" }}>{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock */}
                <div style={{ background: "var(--surface-2)", border: `1px solid ${alerts.lowStockCount > 0 ? "rgba(239,68,68,0.25)" : "var(--border)"}`, borderRadius: 12, padding: "1.25rem" }}>
                    <h3 style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        <Package size={16} style={{ color: alerts.lowStockCount > 0 ? "#ef4444" : "var(--text-muted)" }} />
                        Low Stock Alerts ({alerts.lowStockCount})
                    </h3>
                    {alerts.lowStockCount === 0 ? (
                        <div style={{ color: "#22c55e", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle size={16} /> All stock levels healthy
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {alerts.lowStockAlerts.slice(0, 5).map((item) => (
                                <div key={item.itemName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", background: "var(--surface-3)", borderRadius: 6 }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.itemName}</span>
                                    <span style={{
                                        fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                                        background: item.severity === "Critical" ? "rgba(239,68,68,0.15)" : item.severity === "High" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.1)",
                                        color: item.severity === "Critical" ? "#ef4444" : item.severity === "High" ? "#f59e0b" : "#6366f1",
                                    }}>
                                        {item.quantity} {item.unit} — {item.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Security Alerts */}
            {alerts.securityAlerts.length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "1.25rem" }}>
                    <h3 style={{ fontWeight: 600, color: "#dc2626", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8, fontSize: "1rem" }}>
                        <Shield size={16} /> Security Alerts (Last 24h)
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {alerts.securityAlerts.map((a, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "0.4rem 0", borderBottom: i < alerts.securityAlerts.length - 1 ? "1px solid rgba(239,68,68,0.1)" : "none" }}>
                                <div>
                                    <strong style={{ color: "#dc2626" }}>{a.action}</strong>
                                    <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>on {a.module}</span>
                                </div>
                                <div style={{ color: "var(--text-muted)", textAlign: "right" }}>
                                    <div>{a.ipAddress ?? "unknown IP"}</div>
                                    <div style={{ fontSize: "0.75rem" }}>{new Date(a.createdAt).toLocaleTimeString("en-IN")}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
