"use client";

import { useState, useEffect } from "react";
import styles from "../../admin/inventory/inventory.module.css"; // Reuse inventory styles

type UserWithRoles = {
    id: string;
    name: string;
    email: string;
    roles: string[];
};

type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    details: string;
    createdAt: string;
    user?: { name: string; email: string };
};

const ALL_ROLES = ["SUPER_ADMIN", "HOTEL_ADMIN", "STAFF", "KITCHEN", "CORPORATE"];

export default function UsersAuditPage() {
    const [activeTab, setActiveTab] = useState("Users");
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [roles, setRoles] = useState<string[]>([]);

    useEffect(() => {
        if (activeTab === "Users") fetchUsers();
        if (activeTab === "Audit Logs") fetchAuditLogs();
    }, [activeTab]);

    const fetchUsers = async () => {
        const res = await fetch("/api/users");
        if (res.ok) setUsers(await res.json());
    };

    const fetchAuditLogs = async () => {
        const res = await fetch("/api/audit");
        if (res.ok) setAuditLogs(await res.json());
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, roles })
        });
        if (res.ok) {
            setName(""); setEmail(""); setPassword(""); setRoles([]);
            fetchUsers();
        }
    };

    const toggleRole = (role: string) => {
        if (roles.includes(role)) {
            setRoles(roles.filter(r => r !== role));
        } else {
            setRoles([...roles, role]);
        }
    };

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div className={styles.header}>
                <div>
                    <h1>Staff Access & Audit Logs</h1>
                    <p>Assign granular multiple roles to staff and view global system activity.</p>
                </div>
            </div>

            <div className={styles.tabs}>
                {["Users", "Audit Logs"].map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Users" && (
                <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 className={styles.cardTitle}>Platform Users</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Assigned Roles (Multi)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 'bold' }}>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {u.roles.map(r => (
                                                        <span key={r} style={{ background: 'var(--accent-gold)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ width: '320px' }}>
                        <h2 className={styles.cardTitle}>Create Staff Member</h2>
                        <form onSubmit={handleCreateUser}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</label>
                            <input required value={name} onChange={e => setName(e.target.value)} className={styles.inputField} placeholder="Jane Doe" style={{ marginBottom: '1rem' }} />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email</label>
                            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={styles.inputField} placeholder="jane@hotel.com" style={{ marginBottom: '1rem' }} />

                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Temporary Password</label>
                            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className={styles.inputField} placeholder="••••••••" style={{ marginBottom: '1rem' }} />

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Assign Multiple Roles</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                {ALL_ROLES.map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={roles.includes(role)}
                                            onChange={() => toggleRole(role)}
                                        />
                                        {role}
                                    </label>
                                ))}
                            </div>

                            <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%' }}>Create User</button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === "Audit Logs" && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>System Audit Trail</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Actor</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Details (JSON)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td style={{ fontWeight: 'bold' }}>{log.user?.name || "System"} <br /><span style={{ fontWeight: 'normal', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.user?.email || "-"}</span></td>
                                        <td><span style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{log.action}</span></td>
                                        <td>{log.entityType}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
