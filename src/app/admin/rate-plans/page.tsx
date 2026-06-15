"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

type RatePlan = {
    id: string; name: string; code: string; description?: string;
    baseMultiplier: number; cancellationHours: number; refundPolicy: string; mealPlan: string; isActive: boolean;
    rules: { id: string; ruleType: string; multiplier: number; value?: string }[];
    seasonalRates: { id: string; name: string; startDate: string; endDate: string; multiplier: number; isActive: boolean }[];
};
type Hotel = { id: string; name: string };

const mealPlanLabel: Record<string, string> = {
    RO: "Room Only", CP: "Continental Plan (Breakfast)", MAP: "Modified AP (B+D)", AP: "American Plan (All Meals)",
};
const refundLabel: Record<string, string> = {
    FullRefund48h: "Full Refund (48h)", NoRefund: "No Refund", PartialRefund: "50% Refund",
};

export default function RatePlansPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelId, setHotelId] = useState("");
    const [plans, setPlans] = useState<RatePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState<RatePlan | null>(null);

    const [form, setForm] = useState({
        name: "", code: "", description: "", baseMultiplier: "1.0",
        cancellationHours: "24", refundPolicy: "FullRefund48h", mealPlan: "RO",
        rules: [] as { ruleType: string; multiplier: string; value: string }[],
        seasonalRates: [] as { name: string; startDate: string; endDate: string; multiplier: string }[],
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) { setHotels(d.hotels); setHotelId(d.hotels[0].id); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!hotelId) return;
        setLoading(true);
        const data = await fetch(`/api/rate-plans?hotelId=${hotelId}`).then(r => r.json());
        setPlans(data.plans || []);
        setLoading(false);
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await fetch("/api/rate-plans", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, hotelId }),
        });
        setShowCreate(false); setSaving(false); load();
    };

    const toggleActive = async (plan: RatePlan) => {
        await fetch("/api/rate-plans", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
        });
        load();
    };

    const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { ruleType: "Weekend", multiplier: "1.15", value: "" }] }));
    const addSeasonal = () => setForm(f => ({ ...f, seasonalRates: [...f.seasonalRates, { name: "", startDate: "", endDate: "", multiplier: "1.25" }] }));

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", margin: 0 }}>📋 Rate Plans</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Dynamic pricing engine — seasonal, weekend, corporate, and OTA rates</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {hotels.length > 1 && (
                        <select value={hotelId} onChange={e => setHotelId(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.5rem 0.8rem", borderRadius: "8px" }}>
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                    <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Rate Plan</Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <Card title="Total Plans">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-gold)" }}>{plans.length}</div>
                </Card>
                <Card title="Active Plans">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{plans.filter(p => p.isActive).length}</div>
                </Card>
                <Card title="With Seasonal Rates">
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6366f1" }}>{plans.filter(p => p.seasonalRates.length > 0).length}</div>
                </Card>
                <Card title="Avg. Multiplier">
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>
                        {plans.length > 0 ? `${(plans.reduce((s, p) => s + p.baseMultiplier, 0) / plans.length).toFixed(2)}×` : "—"}
                    </div>
                </Card>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>Loading rate plans…</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
                    {plans.map(plan => (
                        <Card key={plan.id} style={{ cursor: "pointer" }} onClick={() => setSelected(selected?.id === plan.id ? null : plan)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{plan.name}</div>
                                    <code style={{ fontSize: "0.75rem", color: "var(--accent-gold)", background: "rgba(201,169,110,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>{plan.code}</code>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <Badge variant={plan.isActive ? "success" : "neutral"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                                    <button onClick={e => { e.stopPropagation(); toggleActive(plan); }}
                                        style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                                        {plan.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <div style={{ fontSize: "0.82rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Base Multiplier: </span>
                                    <span style={{ fontWeight: 700, color: "#6366f1" }}>{plan.baseMultiplier}×</span>
                                </div>
                                <div style={{ fontSize: "0.82rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Meal: </span>
                                    <span>{mealPlanLabel[plan.mealPlan] || plan.mealPlan}</span>
                                </div>
                                <div style={{ fontSize: "0.82rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Cancel: </span>
                                    <span>{plan.cancellationHours}h free</span>
                                </div>
                                <div style={{ fontSize: "0.82rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Refund: </span>
                                    <span>{refundLabel[plan.refundPolicy] || plan.refundPolicy}</span>
                                </div>
                            </div>

                            {plan.rules.length > 0 && (
                                <div style={{ marginBottom: "0.5rem" }}>
                                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>RULES</div>
                                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                        {plan.rules.map(r => (
                                            <Badge key={r.id} variant="info" style={{ fontSize: "0.7rem" }}>{r.ruleType} {r.multiplier}×</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {plan.seasonalRates.length > 0 && (
                                <div>
                                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>SEASONAL OVERRIDES</div>
                                    {plan.seasonalRates.slice(0, 2).map(s => (
                                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.2rem 0" }}>
                                            <span>{s.name}</span>
                                            <span style={{ color: s.multiplier > 1 ? "#ef4444" : "#10b981", fontWeight: 600 }}>{s.multiplier}×</span>
                                        </div>
                                    ))}
                                    {plan.seasonalRates.length > 2 && (
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>+{plan.seasonalRates.length - 2} more</div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                    {plans.length === 0 && !loading && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                            No rate plans yet. Create your first rate plan to enable dynamic pricing.
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Rate Plan"
                footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} loading={saving}>Create Plan</Button></>}>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                        <Input label="Plan Name *" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Peak Season Corporate" />
                        <Input label="Code *" required value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PEAK" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input label="Base Multiplier" type="number" value={form.baseMultiplier} onChange={(e: any) => setForm({ ...form, baseMultiplier: e.target.value })} />
                        <Input label="Free Cancel Hours" type="number" value={form.cancellationHours} onChange={(e: any) => setForm({ ...form, cancellationHours: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Meal Plan</label>
                            <select value={form.mealPlan} onChange={(e: any) => setForm({ ...form, mealPlan: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem", borderRadius: "8px" }}>
                                {Object.entries(mealPlanLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Refund Policy</label>
                            <select value={form.refundPolicy} onChange={(e: any) => setForm({ ...form, refundPolicy: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.65rem", borderRadius: "8px" }}>
                                {Object.entries(refundLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Rules */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Pricing Rules</label>
                            <Button size="sm" variant="outline" onClick={addRule}>+ Rule</Button>
                        </div>
                        {form.rules.map((r, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <select value={r.ruleType} onChange={e => { const rules = [...form.rules]; rules[i].ruleType = e.target.value; setForm({ ...form, rules }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }}>
                                    {["Weekend", "Weekday", "MinStay", "EarlyBird", "LongStay"].map(t => <option key={t}>{t}</option>)}
                                </select>
                                <input type="number" step="0.01" placeholder="Multiplier" value={r.multiplier}
                                    onChange={e => { const rules = [...form.rules]; rules[i].multiplier = e.target.value; setForm({ ...form, rules }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                                <button onClick={() => setForm(f => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }))}
                                    style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", cursor: "pointer", padding: "0 0.6rem" }}>✕</button>
                            </div>
                        ))}
                    </div>

                    {/* Seasonal Rates */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Seasonal Overrides</label>
                            <Button size="sm" variant="outline" onClick={addSeasonal}>+ Season</Button>
                        </div>
                        {form.seasonalRates.map((s, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr auto", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <input placeholder="Season name" value={s.name} onChange={e => { const sr = [...form.seasonalRates]; sr[i].name = e.target.value; setForm({ ...form, seasonalRates: sr }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                                <input type="date" value={s.startDate} onChange={e => { const sr = [...form.seasonalRates]; sr[i].startDate = e.target.value; setForm({ ...form, seasonalRates: sr }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                                <input type="date" value={s.endDate} onChange={e => { const sr = [...form.seasonalRates]; sr[i].endDate = e.target.value; setForm({ ...form, seasonalRates: sr }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                                <input type="number" step="0.01" placeholder="×" value={s.multiplier} onChange={e => { const sr = [...form.seasonalRates]; sr[i].multiplier = e.target.value; setForm({ ...form, seasonalRates: sr }); }}
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                                <button onClick={() => setForm(f => ({ ...f, seasonalRates: f.seasonalRates.filter((_, j) => j !== i) }))}
                                    style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", cursor: "pointer", padding: "0 0.6rem" }}>✕</button>
                            </div>
                        ))}
                    </div>
                </form>
            </Modal>
        </div>
    );
}
