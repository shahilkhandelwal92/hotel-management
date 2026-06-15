"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Edit3, Plus, Search, ShieldCheck, Trash2, UserRoundCog, UsersRound } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "./users.module.css";

type UserRecord = {
    id: string;
    name: string;
    email: string;
    roles: string[];
    hotelIds: string[];
    assignments: { role: string; hotelId: string | null; hotelName: string }[];
};

type Hotel = { id: string; name: string; location: string };
type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    details?: string;
    createdAt: string;
    user?: { name: string; email: string };
};

const ALL_ROLES = [
    "SUPER_ADMIN",
    "HOTEL_ADMIN",
    "ACCOUNTING",
    "FRONT_DESK",
    "STAFF",
    "HOUSEKEEPING",
    "KITCHEN",
    "RESTAURANT",
    "HR",
    "CORPORATE",
];

const GLOBAL_ROLES = ["SUPER_ADMIN", "OWNER"];
const emptyForm = { name: "", email: "", password: "", roles: [] as string[], hotelIds: [] as string[] };

export default function UsersPage() {
    const [tab, setTab] = useState<"users" | "audit">("users");
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState<UserRecord | null>(null);
    const [form, setForm] = useState(emptyForm);

    const loadUsers = async () => {
        setLoading(true);
        const [usersResponse, hotelsResponse] = await Promise.all([fetch("/api/users"), fetch("/api/hotels")]);
        const [usersData, hotelsData] = await Promise.all([usersResponse.json(), hotelsResponse.json()]);
        if (!usersResponse.ok) setError(usersData.error || "Users could not be loaded.");
        else setUsers(usersData.users || []);
        setHotels(hotelsData.hotels || []);
        setLoading(false);
    };

    const loadAudit = async () => {
        setLoading(true);
        const response = await fetch("/api/audit");
        const data = await response.json();
        if (!response.ok) setError(data.error || "Audit logs could not be loaded.");
        else setAuditLogs(Array.isArray(data) ? data : data.logs || []);
        setLoading(false);
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (tab === "users") void loadUsers();
            else void loadAudit();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [tab]);

    const visibleUsers = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return users.filter((user) => !normalized || `${user.name} ${user.email} ${user.roles.join(" ")}`.toLowerCase().includes(normalized));
    }, [query, users]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (user: UserRecord) => {
        setEditing(user);
        setForm({ name: user.name, email: user.email, password: "", roles: user.roles, hotelIds: user.hotelIds });
        setShowForm(true);
    };

    const toggle = (key: "roles" | "hotelIds", value: string) => {
        setForm((current) => ({
            ...current,
            [key]: current[key].includes(value)
                ? current[key].filter((item) => item !== value)
                : [...current[key], value],
        }));
    };

    const save = async () => {
        setSaving(true);
        setError("");
        const response = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                password: form.password || undefined,
            }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "User could not be saved.");
        else {
            setShowForm(false);
            await loadUsers();
        }
        setSaving(false);
    };

    const remove = async () => {
        if (!deleting) return;
        setSaving(true);
        const response = await fetch(`/api/users/${deleting.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) setError(data.error || "User could not be removed.");
        else {
            setDeleting(null);
            await loadUsers();
        }
        setSaving(false);
    };

    return (
        <div className="page-shell animate-fade-in">
            <div className="page-header">
                <div>
                    <div className="page-eyebrow">Organization access</div>
                    <h1>People & roles</h1>
                    <p className="page-subtitle">Assign employees to one or more properties with only the permissions their job requires.</p>
                </div>
                {tab === "users" && <Button onClick={openCreate}><Plus size={16} /> Add team member</Button>}
            </div>

            {error && <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div>}

            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    <button data-active={tab === "users"} onClick={() => setTab("users")}><UsersRound size={16} /> Team</button>
                    <button data-active={tab === "audit"} onClick={() => setTab("audit")}><ShieldCheck size={16} /> Audit trail</button>
                </div>
                {tab === "users" && <label className={styles.search}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or roles" /></label>}
            </div>

            {tab === "users" ? (
                <>
                    <div className="metric-grid">
                        <div className="metric-card"><UsersRound size={20} color="var(--brand-primary)" /><div className="metric-value">{users.length}</div><p>Active user accounts</p></div>
                        <div className="metric-card"><Building2 size={20} color="var(--success)" /><div className="metric-value">{hotels.length}</div><p>Properties assignable</p></div>
                        <div className="metric-card"><ShieldCheck size={20} color="var(--brand-coral)" /><div className="metric-value">{users.filter((user) => user.roles.includes("SUPER_ADMIN")).length}</div><p>Global super admins</p></div>
                    </div>

                    <div className={styles.userGrid}>
                        {visibleUsers.map((user) => (
                            <article key={user.id} className={styles.userCard}>
                                <div className={styles.userHead}>
                                    <span>{user.name.slice(0, 2).toUpperCase()}</span>
                                    <div><h3>{user.name}</h3><p>{user.email}</p></div>
                                    <div className={styles.cardActions}>
                                        <button onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}><Edit3 size={16} /></button>
                                        <button onClick={() => setDeleting(user)} aria-label={`Remove ${user.name}`}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className={styles.roleList}>{user.roles.map((role) => <Badge key={role} variant={role === "SUPER_ADMIN" ? "primary" : role === "ACCOUNTING" ? "success" : "neutral"}>{role.replaceAll("_", " ")}</Badge>)}</div>
                                <div className={styles.assignments}>
                                    {user.assignments.map((assignment, index) => (
                                        <div key={`${assignment.role}-${assignment.hotelId}-${index}`}>
                                            <Building2 size={14} />
                                            <span><strong>{assignment.hotelName}</strong><small>{assignment.role.replaceAll("_", " ")}</small></span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                        {!loading && visibleUsers.length === 0 && <div className={styles.empty}>No users match your search.</div>}
                    </div>
                </>
            ) : (
                <div className={styles.auditTable}>
                    <div className={styles.auditHead}><span>Time</span><span>Actor</span><span>Action</span><span>Entity</span><span>Details</span></div>
                    {auditLogs.map((log) => (
                        <div key={log.id} className={styles.auditRow}>
                            <span>{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                            <span><strong>{log.user?.name || "System"}</strong><small>{log.user?.email}</small></span>
                            <span><Badge variant="neutral">{log.action}</Badge></span>
                            <span>{log.entityType}</span>
                            <span>{log.details || "Recorded change"}</span>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? `Edit ${editing.name}` : "Add team member"}
                footer={<><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={save} loading={saving}>{editing ? "Save changes" : "Create account"}</Button></>}
            >
                <div className={styles.form}>
                    <div className={styles.formColumns}>
                        <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Employee name" />
                        <Input label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@hotel.com" />
                    </div>
                    <Input label={editing ? "New password (optional)" : "Temporary password"} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" />
                    <div>
                        <label className={styles.formLabel}>Job roles</label>
                        <div className={styles.choiceGrid}>
                            {ALL_ROLES.map((role) => (
                                <button type="button" key={role} data-selected={form.roles.includes(role)} onClick={() => toggle("roles", role)}>
                                    <UserRoundCog size={16} /><span>{role.replaceAll("_", " ")}</span>{form.roles.includes(role) && <CheckMark />}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!form.roles.every((role) => GLOBAL_ROLES.includes(role)) && (
                        <div>
                            <label className={styles.formLabel}>Property access</label>
                            <div className={styles.choiceGrid}>
                                {hotels.map((hotel) => (
                                    <button type="button" key={hotel.id} data-selected={form.hotelIds.includes(hotel.id)} onClick={() => toggle("hotelIds", hotel.id)}>
                                        <Building2 size={16} /><span>{hotel.name}<small>{hotel.location}</small></span>{form.hotelIds.includes(hotel.id) && <CheckMark />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title="Remove team member"
                footer={<><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={remove} loading={saving}>Remove access</Button></>}
            >
                <p>Remove <strong>{deleting?.name}</strong> from the organization? Their access will stop immediately.</p>
            </Modal>
        </div>
    );
}

function CheckMark() {
    return <span className={styles.check}>✓</span>;
}
