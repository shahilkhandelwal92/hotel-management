"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type Invoice = {
    id: string; invoiceNumber: string; invoiceType: string; billedToName: string;
    billedToGstin?: string; billedToState?: string; subTotal: number;
    cgst: number; sgst: number; igst: number; grandTotal: number; status: string;
    createdAt: string; dueDate?: string;
    reservation?: { bookingRef: string; guestName: string };
};
type Hotel = { id: string; name: string };

const invoiceTypeLabel: Record<string, string> = {
    TAX: "Tax Invoice", PROFORMA: "Proforma", CREDIT_NOTE: "Credit Note",
    DEBIT_NOTE: "Debit Note", ADVANCE: "Advance Receipt", REFUND: "Refund",
};
const statusColor: Record<string, "danger" | "warning" | "success" | "neutral"> = {
    Unpaid: "danger", Partial: "warning", Paid: "success", Cancelled: "neutral"
};

export default function InvoicesPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        invoiceType: "TAX", billedToName: "", billedToEmail: "", billedToPhone: "",
        billedToAddress: "", billedToGstin: "", billedToState: "",
        items: [{ itemType: "Room", description: "", quantity: 1, unitPrice: 0, taxRate: 12, hsnSac: "996311" }],
        notes: "", dueDate: "",
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const data = await fetch(`/api/billing/invoices?hotelId=${hotelId}${filter ? `&status=${filter}` : ""}`).then(r => r.json());
        setInvoices(data.invoices || []);
        setLoading(false);
    }, [hotelId, filter]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/billing/invoices", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId }),
        });
        setSaving(false); setShowCreate(false); load();
    };

    const addItem = () => setForm(f => ({
        ...f, items: [...f.items, { itemType: "Room", description: "", quantity: 1, unitPrice: 0, taxRate: 12, hsnSac: "" }]
    }));
    const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx: number, field: string, val: any) =>
        setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));

    const totalUnpaid = invoices.filter(i => i.status === "Unpaid").reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.grandTotal, 0);
    const totalGST = invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);

    const getLabelBadge = (type: string) => {
        const colors: Record<string, "primary" | "warning" | "danger"> = {
            TAX: "primary", PROFORMA: "warning", CREDIT_NOTE: "danger"
        };
        return colors[type] || "neutral";
    };

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>🧾 Invoices</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>GST-compliant billing with CGST/SGST/IGST auto-calculation</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                        <option value="">All Status</option>
                        {["Unpaid", "Partial", "Paid", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Invoice</Button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <Card title="Total Outstanding" subtitle="Unpaid invoices">
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>₹{(totalUnpaid / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="Total Collected" subtitle="Paid invoices">
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>₹{(totalPaid / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="GST Collected" subtitle="All invoices">
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6366f1" }}>₹{(totalGST / 1000).toFixed(1)}K</div>
                </Card>
                <Card title="Total Invoices" subtitle="All types">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-gold)" }}>{invoices.length}</div>
                </Card>
            </div>

            <Card title="Invoice Register" subtitle="Full GST billing log">
                <Table headers={["Invoice #", "Type", "Billed To", "State", "Sub Total", "CGST", "SGST", "IGST", "Grand Total", "Status", "Date"]}
                    loading={loading} emptyMessage="No invoices found. Create your first invoice.">
                    {invoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "0.9rem 1rem", fontFamily: "monospace", color: "var(--accent-gold)", fontWeight: 600, whiteSpace: "nowrap" }}>{inv.invoiceNumber}</td>
                            <td style={{ padding: "0.9rem 1rem" }}>
                                <Badge variant={getLabelBadge(inv.invoiceType)}>{invoiceTypeLabel[inv.invoiceType] || inv.invoiceType}</Badge>
                            </td>
                            <td style={{ padding: "0.9rem 1rem" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{inv.billedToName}</div>
                                {inv.billedToGstin && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>GSTIN: {inv.billedToGstin}</div>}
                            </td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem" }}>{inv.billedToState || "–"}</td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.9rem" }}>₹{inv.subTotal.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem", color: inv.cgst > 0 ? "#10b981" : "var(--text-secondary)" }}>₹{inv.cgst.toFixed(2)}</td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem", color: inv.sgst > 0 ? "#10b981" : "var(--text-secondary)" }}>₹{inv.sgst.toFixed(2)}</td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem", color: inv.igst > 0 ? "#f59e0b" : "var(--text-secondary)" }}>₹{inv.igst.toFixed(2)}</td>
                            <td style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>₹{inv.grandTotal.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "0.9rem 1rem" }}><Badge variant={statusColor[inv.status] || "neutral"}>{inv.status}</Badge></td>
                            <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(inv.createdAt).toLocaleDateString("en-IN")}</td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "#10b981", fontSize: "0.9rem" }}>🇮🇳 GST Auto-Split Logic</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>• <strong>Intra-State:</strong> CGST (50%) + SGST (50%)</span>
                    <span>• <strong>Inter-State:</strong> IGST (100%)</span>
                    <span>• <strong>B2B:</strong> GSTIN captured for ITC</span>
                    <span>• <strong>HSN/SAC:</strong> 996311 (Room), 996331 (F&B)</span>
                </div>
            </div>

            {/* Create Invoice Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice"
                footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Generate Invoice</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Invoice Type</label>
                        <select value={form.invoiceType} onChange={(e: any) => setForm({ ...form, invoiceType: e.target.value })}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 1rem", borderRadius: "8px" }}>
                            {Object.entries(invoiceTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Billed To *" required value={form.billedToName} onChange={(e: any) => setForm({ ...form, billedToName: e.target.value })} />
                        <Input label="Guest State (GST)" value={form.billedToState} onChange={(e: any) => setForm({ ...form, billedToState: e.target.value })} placeholder="e.g. Maharashtra" />
                        <Input label="GSTIN (B2B)" value={form.billedToGstin} onChange={(e: any) => setForm({ ...form, billedToGstin: e.target.value })} />
                        <Input label="Email" value={form.billedToEmail} onChange={(e: any) => setForm({ ...form, billedToEmail: e.target.value })} />
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Line Items</label>
                            <Button size="sm" variant="outline" onClick={addItem}>+ Add Item</Button>
                        </div>
                        {form.items.map((item, idx) => (
                            <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.7fr auto", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "end" }}>
                                <Input label={idx === 0 ? "Description" : ""} value={item.description} onChange={(e: any) => updateItem(idx, "description", e.target.value)} placeholder="Service description" />
                                <Input label={idx === 0 ? "Unit Price" : ""} type="number" value={item.unitPrice as any} onChange={(e: any) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                                <Input label={idx === 0 ? "Qty" : ""} type="number" value={item.quantity as any} onChange={(e: any) => updateItem(idx, "quantity", parseFloat(e.target.value) || 1)} />
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                    {idx === 0 && <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>GST%</label>}
                                    <select value={item.taxRate} onChange={(e: any) => updateItem(idx, "taxRate", parseFloat(e.target.value))}
                                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem 0.5rem", borderRadius: "8px" }}>
                                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                    </select>
                                </div>
                                {form.items.length > 1 && (
                                    <button onClick={() => removeItem(idx)} style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", cursor: "pointer", padding: "0.5rem", fontSize: "0.8rem", marginTop: idx === 0 ? "1.4rem" : 0 }}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>
                    <Input label="Notes" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, special instructions…" />
                </form>
            </Modal>
        </div>
    );
}
