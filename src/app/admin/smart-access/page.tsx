"use client";
import { useState, useEffect, useCallback } from "react";
import { Key, ShieldOff, CheckCircle, XCircle, Clock, Users, Activity, RefreshCw, QrCode, AlertTriangle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface Credential {
    id: string; accessType: string; accessScope: string; provider: string;
    userType: string; status: string; validFrom: string; validUntil: string;
    externalRef?: string; reservationId?: string; userId?: string; createdAt: string;
}
interface AccessLogEntry {
    id: string; action: string; source: string; deviceId?: string;
    timestamp: string; userType: string; roomId?: string;
    credential?: { accessScope: string; accessType: string };
}
interface AttendanceEntry {
    id: string; userId: string; action: string; method: string;
    latitude?: number; longitude?: number; createdAt: string;
}
interface LogSummary { ENTRY: number; EXIT: number; DENIED: number; }

const STATUS_COLOR: Record<string, string> = {
    Active: "#22c55e", Revoked: "#ef4444", Expired: "#f59e0b",
};
const ACTION_COLOR: Record<string, string> = {
    ENTRY: "#22c55e", EXIT: "#6366f1", DENIED: "#ef4444",
    CHECK_IN: "#22c55e", CHECK_OUT: "#8b5cf6",
};

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            padding: "2px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 600,
            background: `${color}18`, color, border: `1px solid ${color}30`,
        }}>{label}</span>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12,
            padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
            </div>
        </div>
    );
}

/* ── Credentials Tab ──────────────────────────────────────── */
function CredentialsTab() {
    const [items, setItems] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("Active");
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/access/credentials?status=${statusFilter}&limit=100`)
            .then((r) => r.json()).then((d) => setItems(d.credentials ?? []))
            .finally(() => setLoading(false));
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const revoke = async (id: string) => {
        if (!confirm("Revoke this credential? The guest/staff will lose door access immediately.")) return;
        setRevoking(id);
        await fetch(`/api/access/credentials/${id}`, { method: "DELETE" });
        setRevoking(null);
        load();
    };

    return (
        <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                {["Active", "Revoked", "Expired"].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                        padding: "0.4rem 1rem", borderRadius: 8, border: `1.5px solid ${statusFilter === s ? STATUS_COLOR[s] : "var(--border)"}`,
                        background: statusFilter === s ? `${STATUS_COLOR[s]}15` : "var(--surface-2)",
                        color: statusFilter === s ? STATUS_COLOR[s] : "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                    }}>{s}</button>
                ))}
                <button onClick={load} style={{ marginLeft: "auto", padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer" }}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading…</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {items.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No {statusFilter.toLowerCase()} credentials</div>}
                    {items.map((c) => (
                        <div key={c.id} style={{
                            background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10,
                            padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
                        }}>
                            <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <Key size={14} style={{ color: STATUS_COLOR[c.status] }} />
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{c.accessType}</span>
                                    <Badge label={c.accessScope} color="#6366f1" />
                                    <Badge label={c.userType} color="#8b5cf6" />
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    Valid: {new Date(c.validFrom).toLocaleDateString("en-IN")} → {new Date(c.validUntil).toLocaleDateString("en-IN")}
                                    {c.externalRef && <span style={{ marginLeft: 8 }}>· Ref: {c.externalRef.slice(0, 20)}…</span>}
                                </div>
                            </div>
                            <Badge label={c.status} color={STATUS_COLOR[c.status]} />
                            {c.status === "Active" && (
                                <button onClick={() => revoke(c.id)} disabled={revoking === c.id} style={{
                                    padding: "0.35rem 0.75rem", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)",
                                    background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                                }}>
                                    {revoking === c.id ? "…" : "Revoke"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Entry Log Tab ────────────────────────────────────────── */
function EntryLogTab() {
    const [logs, setLogs] = useState<AccessLogEntry[]>([]);
    const [summary, setSummary] = useState<LogSummary>({ ENTRY: 0, EXIT: 0, DENIED: 0 });
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = filter === "all" ? "" : `&action=${filter}`;
        fetch(`/api/access/logs?limit=100${q}`)
            .then((r) => r.json())
            .then((d) => { setLogs(d.logs ?? []); setSummary(d.summary ?? { ENTRY: 0, EXIT: 0, DENIED: 0 }); })
            .finally(() => setLoading(false));
    }, [filter]);

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
                <StatCard label="Entries" value={summary.ENTRY} icon={<CheckCircle size={18} />} color="#22c55e" />
                <StatCard label="Exits" value={summary.EXIT} icon={<XCircle size={18} />} color="#6366f1" />
                <StatCard label="Denied" value={summary.DENIED} icon={<AlertTriangle size={18} />} color="#ef4444" />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {["all", "ENTRY", "EXIT", "DENIED"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: "0.35rem 0.9rem", borderRadius: 8, border: `1.5px solid ${filter === f ? "#6366f1" : "var(--border)"}`,
                        background: filter === f ? "rgba(99,102,241,0.12)" : "var(--surface-2)",
                        color: filter === f ? "#6366f1" : "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                    }}>{f === "all" ? "All Events" : f}</button>
                ))}
            </div>
            {loading ? <div style={{ color: "var(--text-muted)" }}>Loading…</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 500, overflowY: "auto" }}>
                    {logs.length === 0 && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>No log entries for this period</div>}
                    {logs.map((l) => (
                        <div key={l.id} style={{
                            display: "flex", alignItems: "center", gap: "1rem",
                            padding: "0.65rem 1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)",
                            flexWrap: "wrap",
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTION_COLOR[l.action], flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600, color: ACTION_COLOR[l.action], fontSize: "0.85rem" }}>{l.action}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginLeft: 8 }}>
                                    {l.userType} · {l.source}{l.roomId ? ` · Room ${l.roomId}` : ""}{l.deviceId ? ` · ${l.deviceId}` : ""}
                                </span>
                            </div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{new Date(l.timestamp).toLocaleString("en-IN")}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Staff Attendance Tab ─────────────────────────────────── */
function AttendanceTab() {
    const [logs, setLogs] = useState<AttendanceEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // StaffAttendanceLog is read from AuditLog in Phase A
        // Full endpoint in Phase B connects to /api/access/staff-attendance
        fetch("/api/access/logs?limit=50")
            .then((r) => r.json())
            .then(() => setLogs([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div style={{ padding: "2rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
                <QrCode size={48} style={{ color: "#6366f1", margin: "0 auto 1rem" }} />
                <h3 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Staff QR Attendance</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 420, margin: "0 auto 1.5rem" }}>
                    Staff use the dynamic QR code (rotates every 60s) to clock in/out. Logs appear here in real-time.
                </p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <div style={{ padding: "0.75rem 1.25rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, color: "#6366f1", fontSize: "0.85rem" }}>QR Token API</div>
                        <code style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>POST /api/access/staff-qr/generate</code>
                    </div>
                    <div style={{ padding: "0.75rem 1.25rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, color: "#22c55e", fontSize: "0.85rem" }}>Verify + Log</div>
                        <code style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>POST /api/access/staff-qr/verify</code>
                    </div>
                </div>
                {loading && <p style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading attendance logs…</p>}
                {!loading && logs.length === 0 && <p style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No check-ins today. Staff should use the QR scanner in the app.</p>}
            </div>
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function SmartAccessPage() {
    const [tab, setTab] = useState<"credentials" | "logs" | "attendance">("credentials");

    const tabs = [
        { key: "credentials", label: "🔑 Credentials", icon: <Key size={15} /> },
        { key: "logs", label: "📋 Entry Log", icon: <Activity size={15} /> },
        { key: "attendance", label: "🕐 Staff Attendance", icon: <Users size={15} /> },
    ] as const;

    return (
        <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.75rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                    <ShieldOff size={24} style={{ color: "#6366f1" }} /> Smart Access Control
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Manage door keys, track entry/exit events, and monitor staff attendance.
                </p>
            </div>

            {/* Add-on badge */}
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "0.4rem 1rem",
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 99,
                fontSize: "0.8rem", fontWeight: 600, color: "#d97706", marginBottom: "1.5rem",
            }}>
                <Clock size={13} /> Smart Access Add-on · Starts at ₹1,999/month
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem", gap: "0" }}>
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: "0.6rem 1.25rem", border: "none", background: "none", cursor: "pointer",
                        borderBottom: `2.5px solid ${tab === t.key ? "#6366f1" : "transparent"}`,
                        color: tab === t.key ? "#6366f1" : "var(--text-muted)",
                        fontWeight: tab === t.key ? 700 : 400, fontSize: "0.9rem",
                        display: "flex", alignItems: "center", gap: 6, marginBottom: -2,
                        transition: "all 0.2s",
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "credentials" && <CredentialsTab />}
            {tab === "logs" && <EntryLogTab />}
            {tab === "attendance" && <AttendanceTab />}
        </div>
    );
}
