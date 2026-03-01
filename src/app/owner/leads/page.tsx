"use client";

import { useState, useEffect } from "react";
import styles from "./leads.module.css";

type Lead = {
    id: string;
    hotelName: string;
    contactPerson: string;
    contactMobile: string;
    status: string;
    estimatedValue: number;
    notes: string;
};

const PIPELINE_STAGES = ["Scratch", "Contacted", "Negotiating", "Onboarded", "Lost"];

export default function LeadsPipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form states
    const [hotelName, setHotelName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [contactMobile, setContactMobile] = useState("");
    const [estimatedValue, setEstimatedValue] = useState("");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const res = await fetch("/api/leads");
        if (res.ok) {
            const data = await res.json();
            setLeads(data);
        }
        setLoading(false);
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotelName, contactPerson, contactMobile, estimatedValue })
        });
        if (res.ok) {
            setShowAddModal(false);
            setHotelName(""); setContactPerson(""); setContactMobile(""); setEstimatedValue("");
            fetchLeads();
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("leadId", id);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");

        // Optimistic UI update
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

        await fetch("/api/leads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: leadId, status: newStatus })
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow dropping
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Pipeline...</div>;

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Global Sales Pipeline</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Drag and drop leads through the onboarding funnel.</p>
                </div>
                <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>+ New Lead</button>
            </div>

            <div className={styles.kanbanBoard}>
                {PIPELINE_STAGES.map(stage => {
                    const stageLeads = leads.filter(l => l.status === stage);
                    const stageTotal = stageLeads.reduce((acc, l) => acc + l.estimatedValue, 0);

                    return (
                        <div
                            key={stage}
                            className={styles.column}
                            onDrop={(e) => handleDrop(e, stage)}
                            onDragOver={handleDragOver}
                        >
                            <div className={styles.colHeader}>
                                <span>{stage} <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>({stageLeads.length})</span></span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{formatCurrency(stageTotal)}</span>
                            </div>
                            <div className={styles.cardList}>
                                {stageLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        className={styles.leadCard}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                    >
                                        <div className={styles.leadName}>{lead.hotelName}</div>
                                        <div className={styles.leadMeta}>👤 {lead.contactPerson}</div>
                                        <div className={styles.leadMeta}>📞 {lead.contactMobile}</div>
                                        <div className={styles.leadValue}>{formatCurrency(lead.estimatedValue)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Lead Modal Overlay */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--accent-gold)' }}>
                        <h2>Add Marketing Lead</h2>
                        <form onSubmit={handleAddLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <input required value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Property Name" style={{ padding: '0.8rem', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                            <input required value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Contact Person" style={{ padding: '0.8rem', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                            <input required value={contactMobile} onChange={e => setContactMobile(e.target.value)} placeholder="Phone Number" style={{ padding: '0.8rem', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                            <input type="number" required value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="Est. Annual Contract Value (₹)" style={{ padding: '0.8rem', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
