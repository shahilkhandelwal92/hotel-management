"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";

interface Permission {
    id: string;
    name: string;
    description: string | null;
}

interface Role {
    id: string;
    name: string;
    permissions: { permission: Permission }[];
}

export default function RolesManager() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [formName, setFormName] = useState("");
    const [formPermissions, setFormPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                fetch("/api/roles"),
                fetch("/api/permissions")
            ]);
            const rolesData = await rolesRes.json();
            const permsData = await permsRes.json();
            setRoles(rolesData || []);
            setPermissions(permsData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        setEditRole(null);
        setFormName("");
        setFormPermissions([]);
        setShowModal(true);
    };

    const openEditModal = (r: Role) => {
        setEditRole(r);
        setFormName(r.name);
        setFormPermissions(r.permissions.map(p => p.permission.id));
        setShowModal(true);
    };

    const togglePermission = (pid: string) => {
        setFormPermissions(prev =>
            prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
        );
    };

    const handleSave = async () => {
        if (!formName) return alert("Role name is required");

        setSaving(true);
        const url = editRole ? `/api/roles/${editRole.id}` : "/api/roles";
        const method = editRole ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: formName, permissionIds: formPermissions })
        });

        if (res.ok) {
            setShowModal(false);
            fetchData();
        } else {
            alert("Failed to save role");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this role completely?")) return;
        const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    };

    return (
        <div style={{ padding: "1rem" }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Role Management</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Dynamically assign system permissions to access roles.</p>
                </div>
                <Button variant="primary" onClick={openCreateModal}>+ Create Role</Button>
            </div>

            <Card>
                <Table headers={["Role", "Mapped Permissions Count", "Actions"]} loading={loading}>
                    {roles.map(r => (
                        <tr key={r.id}>
                            <td style={{ padding: "1rem" }}><strong>{r.name}</strong></td>
                            <td style={{ padding: "1rem" }}>
                                <span style={{ background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem" }}>
                                    {r.permissions.length} Permissions
                                </span>
                            </td>
                            <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                                <Button size="sm" variant="secondary" onClick={() => openEditModal(r)}>Edit Mappings</Button>
                                {r.name !== 'SUPER_ADMIN' && <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>}
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editRole ? "Edit Role mappings" : "Create New Role"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} loading={saving}>{editRole ? "Save Changes" : "Create"}</Button>
                    </>
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <Input
                        label="Role Name (e.g. ACCOUNTING)"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        disabled={editRole?.name === 'SUPER_ADMIN'}
                    />

                    <div>
                        <h4 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Feature Permissions</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            {permissions.map(p => (
                                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.8rem", cursor: "pointer", background: "rgba(255,255,255,0.03)", padding: "0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                                    <input
                                        type="checkbox"
                                        checked={formPermissions.includes(p.id)}
                                        onChange={() => togglePermission(p.id)}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</span>
                                        {p.description && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{p.description}</span>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
