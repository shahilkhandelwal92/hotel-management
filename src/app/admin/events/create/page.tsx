"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../events.module.css";
import React from "react";

export default function CreateEventPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [corporateName, setCorporateName] = useState("");
    const [date, setDate] = useState("");
    const [expectedCount, setExpectedCount] = useState("");
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) {
                setHotels(d.hotels);
                setHotelId(d.hotels[0].id);
            } else {
                // No hotels yet — still allow form submission, API will use user's hotel
                setHotels([]);
            }
        }).catch(() => setHotels([]));
    }, []);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) setFileUploaded(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, corporateName, date, expectedCount, hotelId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create event");
            router.push(`/admin/events/${data.event.id}`);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <h1 className="text-2xl font-bold">Create Corporate Event</h1>
            </div>

            {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#ef4444", fontSize: "0.875rem" }}>
                    ⚠️ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.formContainer}>
                <div className={styles.grid}>
                    {hotels.length > 1 && (
                        <div className={styles.formGroup}>
                            <label>Hotel Property</label>
                            <select className={styles.inputField} value={hotelId} onChange={e => setHotelId(e.target.value)}>
                                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label>Event Name *</label>
                        <input required type="text" className={styles.inputField} value={name}
                            onChange={e => setName(e.target.value)} placeholder="e.g. Annual Tech Summit" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Corporate/Company Name *</label>
                        <input required type="text" className={styles.inputField} value={corporateName}
                            onChange={e => setCorporateName(e.target.value)} placeholder="e.g. Acme Corp" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Event Date *</label>
                        <input required type="date" className={styles.inputField} value={date}
                            onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Expected Guest Count</label>
                        <input type="number" className={styles.inputField} value={expectedCount}
                            onChange={e => setExpectedCount(e.target.value)} placeholder="e.g. 150" />
                    </div>
                </div>

                <div className={styles.formGroup} style={{ marginTop: "1.5rem" }}>
                    <label>Import Guest List (Excel/CSV) — Optional</label>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                        Columns: Name, Mobile, Email
                    </p>
                    <div className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ""}`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                        {!fileUploaded ? (
                            <>
                                <div className={styles.uploadIcon}>📄</div>
                                <div className={styles.uploadText}>Drag and drop your file here or</div>
                                <label style={{ display: "inline-block", cursor: "pointer", color: "var(--accent-blue)", fontWeight: 500 }}>
                                    Browse Files
                                    <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                                        onChange={e => { if (e.target.files?.[0]) setFileUploaded(true); }} />
                                </label>
                            </>
                        ) : (
                            <div style={{ color: "#34d399", fontWeight: 500 }}>✅ File ready for import after event is created.</div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                    <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ padding: "0.75rem 1.5rem" }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ padding: "0.75rem 1.5rem" }} disabled={loading}>
                        {loading ? "Creating..." : "Create Event & Import"}
                    </button>
                </div>
            </form>
        </div>
    );
}
