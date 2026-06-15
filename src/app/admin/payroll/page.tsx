"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type PayrollRecord = {
    id: string; userId: string; month: string; paymentStatus: string;
    basicSalary: number; hra: number; grossSalary: number; pf: number;
    esi: number; pt: number; tds: number; totalDeductions: number; netSalary: number;
    workingDays: number; lopDays: number; bonus: number; overtime: number; remarks?: string;
    user: { id: string; name: string; email: string };
};
type Hotel = { id: string; name: string };
type Staff = { id: string; name: string; email: string };

const statusColor: Record<string, "neutral" | "warning" | "success"> = {
    Draft: "neutral", Approved: "warning", Paid: "success"
};

export default function PayrollPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [staff, setStaff] = useState<Staff[]>([]);
    const [records, setRecords] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [form, setForm] = useState({
        userId: "", basicSalary: 0, hra: 0, conveyance: 1600, medicalAllowance: 1250,
        otherAllowances: 0, overtime: 0, bonus: 0, incentives: 0,
        otherDeductions: 0, lopDays: 0, workingDays: 26, remarks: ""
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const [pr, sr] = await Promise.all([
            fetch(`/api/payroll?hotelId=${hotelId}&month=${currentMonth}`).then(r => r.json()),
            fetch(`/api/users?hotelId=${hotelId}`).then(r => r.json()),
        ]);
        setRecords(pr.records || []);
        setStaff(sr.users || []);
        setLoading(false);
    }, [hotelId, currentMonth]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/payroll", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId, month: currentMonth }),
        });
        setSaving(false); setShowAdd(false); load();
    };

    const updateStatus = async (id: string, action: "approve" | "mark_paid") => {
        await fetch("/api/payroll", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action }),
        });
        load();
    };

    const exportCSV = () => {
        const rows = [
            ["Name", "Email", "Month", "Basic", "HRA", "Gross", "PF", "ESI", "PT", "TDS", "Net", "Status"],
            ...records.map(r => [r.user.name, r.user.email, r.month, r.basicSalary, r.hra, r.grossSalary, r.pf, r.esi, r.pt, r.tds, r.netSalary, r.paymentStatus]),
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `payroll_${currentMonth}.csv`; a.click();
    };

    const totalGross = records.reduce((s, r) => s + r.grossSalary, 0);
    const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
    const totalPF = records.reduce((s, r) => s + r.pf, 0);
    const pending = records.filter(r => r.paymentStatus === "Draft").length;

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>💰 Payroll</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>India-compliant payroll with PF, ESI, PT & TDS</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }} />
                    <Button variant="outline" onClick={exportCSV}>⬇ Export CSV</Button>
                    <Button variant="primary" onClick={() => setShowAdd(true)}>+ Add Payroll</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <Card title="Gross Salary" subtitle="Total payable">
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-gold)" }}>₹{(totalGross / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="Net Payable" subtitle="After deductions">
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981" }}>₹{(totalNet / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="Total PF" subtitle="Employer + Employee">
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#6366f1" }}>₹{(totalPF * 2 / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="Pending Approval" subtitle="Draft records">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: pending > 0 ? "#f59e0b" : "#10b981" }}>{pending}</div>
                </Card>
            </div>

            <Card title={`Payroll — ${currentMonth}`} subtitle="Employee-wise payroll details">
                <Table headers={["Employee", "Basic", "HRA", "Gross", "PF", "ESI", "PT", "TDS", "Net Pay", "Status", "Actions"]}
                    loading={loading} emptyMessage="No payroll records. Click '+ Add Payroll' to process.">
                    {records.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ fontWeight: 600 }}>{r.user.name}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{r.user.email}</div>
                            </td>
                            {[r.basicSalary, r.hra, r.grossSalary, r.pf, r.esi, r.pt, r.tds].map((val, i) => (
                                <td key={i} style={{ padding: "1rem 1.25rem", fontSize: "0.9rem" }}>₹{val.toLocaleString("en-IN")}</td>
                            ))}
                            <td style={{ padding: "1rem 1.25rem", fontWeight: 700, color: "#10b981" }}>₹{r.netSalary.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "1rem 1.25rem" }}><Badge variant={statusColor[r.paymentStatus] || "neutral"}>{r.paymentStatus}</Badge></td>
                            <td style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                    {r.paymentStatus === "Draft" && <Button size="sm" variant="primary" onClick={() => updateStatus(r.id, "approve")}>Approve</Button>}
                                    {r.paymentStatus === "Approved" && <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, "mark_paid")}>Mark Paid</Button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            {/* Info Box */}
            <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "#6366f1" }}>📊 India Statutory Deductions Applied Automatically</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>• PF: 12% of Basic (Employee)</span>
                    <span>• ESI: 0.75% if Gross ≤ ₹21,000</span>
                    <span>• PT: ₹200/mo (varies by state)</span>
                    <span>• TDS: New Tax Regime slabs</span>
                </div>
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={`Add Payroll – ${currentMonth}`}
                footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Process Payroll</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Employee *</label>
                        <select required value={form.userId} onChange={(e: any) => setForm({ ...form, userId: e.target.value })}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                            <option value="">Select Employee</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Basic Salary (₹)" type="number" value={form.basicSalary as any} onChange={(e: any) => setForm({ ...form, basicSalary: parseFloat(e.target.value) || 0 })} />
                        <Input label="HRA (₹)" type="number" value={form.hra as any} onChange={(e: any) => setForm({ ...form, hra: parseFloat(e.target.value) || 0 })} />
                        <Input label="Conveyance (₹)" type="number" value={form.conveyance as any} onChange={(e: any) => setForm({ ...form, conveyance: parseFloat(e.target.value) || 0 })} />
                        <Input label="Medical Allowance (₹)" type="number" value={form.medicalAllowance as any} onChange={(e: any) => setForm({ ...form, medicalAllowance: parseFloat(e.target.value) || 0 })} />
                        <Input label="Overtime (₹)" type="number" value={form.overtime as any} onChange={(e: any) => setForm({ ...form, overtime: parseFloat(e.target.value) || 0 })} />
                        <Input label="Bonus (₹)" type="number" value={form.bonus as any} onChange={(e: any) => setForm({ ...form, bonus: parseFloat(e.target.value) || 0 })} />
                        <Input label="LOP Days" type="number" value={form.lopDays as any} onChange={(e: any) => setForm({ ...form, lopDays: parseInt(e.target.value) || 0 })} />
                        <Input label="Working Days" type="number" value={form.workingDays as any} onChange={(e: any) => setForm({ ...form, workingDays: parseInt(e.target.value) || 26 })} />
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                        PF (12%), ESI (0.75%), PT & TDS calculated automatically on submission.
                    </p>
                </form>
            </Modal>
        </div>
    );
}
