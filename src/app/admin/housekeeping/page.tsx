"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type Task = {
    id: string; roomNumber: string; taskType: string; priority: string; status: string;
    notes?: string; completedAt?: string; createdAt: string;
    room?: { type: string; floor: number; status: string };
    assignedTo?: { id: string; name: string };
    checklist?: { item: string; done: boolean }[];
};
type Hotel = { id: string; name: string };
type Staff = { id: string; name: string };

const priorityColor: Record<string, "danger" | "warning" | "primary" | "neutral"> = {
    Urgent: "danger", High: "warning", Normal: "primary", Low: "neutral"
};
const statusColor: Record<string, "warning" | "primary" | "success" | "neutral"> = {
    Pending: "warning", InProgress: "primary", Completed: "success", Skipped: "neutral"
};

export default function HousekeepingPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [form, setForm] = useState({
        roomNumber: "", taskType: "Clean", priority: "Normal", assignedToId: "", notes: ""
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const [taskRes, staffRes] = await Promise.all([
            fetch(`/api/housekeeping?hotelId=${hotelId}${statusFilter ? `&status=${statusFilter}` : ""}`).then(r => r.json()),
            fetch(`/api/users?hotelId=${hotelId}`).then(r => r.json()),
        ]);
        setTasks(taskRes.tasks || []);
        setStaff(staffRes.users || []);
        setLoading(false);
    }, [hotelId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/housekeeping", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId }),
        });
        setSaving(false); setShowAdd(false); load();
    };

    const updateTask = async (id: string, updates: any) => {
        setSaving(true);
        await fetch("/api/housekeeping", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });
        setSaving(false);
        if (viewTask) setViewTask(prev => prev ? { ...prev, ...updates } : null);
        load();
    };

    const toggleChecklistItem = (task: Task, idx: number) => {
        const newChecklist = (task.checklist || []).map((c, i) => i === idx ? { ...c, done: !c.done } : c);
        updateTask(task.id, { checklist: newChecklist });
    };

    const counts = {
        pending: tasks.filter(t => t.status === "Pending").length,
        inProgress: tasks.filter(t => t.status === "InProgress").length,
        completed: tasks.filter(t => t.status === "Completed").length,
        urgent: tasks.filter(t => t.priority === "Urgent" && t.status === "Pending").length,
    };

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>🧹 Housekeeping</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Room cleaning tasks, inspection & assignments</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="outline" onClick={() => window.location.href = "/admin/housekeeping/lost-found"}>📦 Lost & Found</Button>
                    <Button variant="primary" onClick={() => setShowAdd(true)}>+ New Task</Button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {[
                    { label: "Pending", val: counts.pending, color: "var(--accent-gold)", filter: "Pending" },
                    { label: "In Progress", val: counts.inProgress, color: "#6366f1", filter: "InProgress" },
                    { label: "Completed", val: counts.completed, color: "#10b981", filter: "Completed" },
                    { label: "🚨 Urgent", val: counts.urgent, color: "#ef4444", filter: "" },
                ].map(s => (
                    <Card key={s.label} title={s.label} style={{ cursor: "pointer", border: statusFilter === s.filter ? "1px solid var(--accent-gold)" : undefined }}
                        onClick={() => setStatusFilter(s.filter)}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 700, color: s.color }}>{loading ? "…" : s.val}</div>
                    </Card>
                ))}
            </div>

            {/* Task Table */}
            <Card title="Housekeeping Tasks" subtitle="Assign, track, and complete room tasks">
                <Table headers={["Room", "Task", "Priority", "Assigned To", "Status", "Created", "Actions"]} loading={loading}
                    emptyMessage="No housekeeping tasks. All rooms are clean! ✨">
                    {tasks.map(task => (
                        <tr key={task.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ fontWeight: 700, color: "var(--accent-gold)" }}>#{task.roomNumber}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{task.room?.type} • Floor {task.room?.floor}</div>
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>{task.taskType}</td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={priorityColor[task.priority] || "neutral"}>{task.priority}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.9rem" }}>{task.assignedTo?.name || <span style={{ color: "var(--text-secondary)" }}>Unassigned</span>}</td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={statusColor[task.status] || "neutral"}>{task.status}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {new Date(task.createdAt).toLocaleDateString("en-IN")}
                            </td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <Button size="sm" variant="outline" onClick={() => setViewTask(task)}>View</Button>
                                    {task.status === "Pending" && <Button size="sm" variant="primary" onClick={() => updateTask(task.id, { status: "InProgress" })}>Start</Button>}
                                    {task.status === "InProgress" && <Button size="sm" variant="secondary" onClick={() => updateTask(task.id, { status: "Completed" })}>Done ✓</Button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Create Modal */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create Housekeeping Task"
                footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Create Task</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Input label="Room Number *" required value={form.roomNumber} onChange={(e: any) => setForm({ ...form, roomNumber: e.target.value })} placeholder="e.g. 101" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        {[{ label: "Task Type", key: "taskType", opts: ["Clean", "Inspect", "Turndown", "Maintenance", "Linen Change"] },
                        { label: "Priority", key: "priority", opts: ["Low", "Normal", "High", "Urgent"] }].map(sel => (
                            <div key={sel.key} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{sel.label}</label>
                                <select value={(form as any)[sel.key]} onChange={(e: any) => setForm({ ...form, [sel.key]: e.target.value })}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                                    {sel.opts.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Assign To</label>
                        <select value={form.assignedToId} onChange={(e: any) => setForm({ ...form, assignedToId: e.target.value })}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                            <option value="">Unassigned</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Notes</label>
                        <textarea value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} rows={2}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.65rem 1rem", color: "#fff" }} />
                    </div>
                </form>
            </Modal>

            {/* View Task + Checklist Modal */}
            {viewTask && (
                <Modal isOpen={!!viewTask} onClose={() => setViewTask(null)} title={`Task: ${viewTask.taskType} – Room #${viewTask.roomNumber}`}
                    footer={<Button variant="outline" onClick={() => setViewTask(null)}>Close</Button>}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <Badge variant={priorityColor[viewTask.priority] || "neutral"}>{viewTask.priority} Priority</Badge>
                            <Badge variant={statusColor[viewTask.status] || "neutral"}>{viewTask.status}</Badge>
                        </div>
                        {viewTask.notes && <p style={{ color: "var(--text-secondary)", margin: 0 }}>{viewTask.notes}</p>}
                        <div>
                            <h4 style={{ margin: "0 0 0.75rem", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cleaning Checklist</h4>
                            {(viewTask.checklist || []).map((item, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(viewTask, idx)}
                                        style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer" }} />
                                    <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "var(--text-secondary)" : "#fff" }}>{item.item}</span>
                                </div>
                            ))}
                        </div>
                        {viewTask.status !== "Completed" && (
                            <Button variant="primary" onClick={() => { updateTask(viewTask.id, { status: "Completed" }); setViewTask(null); }}>
                                ✓ Mark as Complete
                            </Button>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
