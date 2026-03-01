"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../events.module.css";
import React from "react";

export default function CreateEventPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [corporateName, setCorporateName] = useState("");
    const [date, setDate] = useState("");
    const [expectedCount, setExpectedCount] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFileUploaded(true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileUploaded(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Mock save delay
        setTimeout(() => {
            setLoading(false);
            router.push("/admin/events");
        }, 1000);
    };

    return (
        <div className="animate-fade-in">
            <div className={styles.header}>
                <h1 className="text-2xl font-bold">Create Corporate Event</h1>
            </div>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label>Event Name</label>
                        <input
                            required
                            type="text"
                            className={styles.inputField}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Annual Tech Summit"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Corporate/Company Name</label>
                        <input
                            required
                            type="text"
                            className={styles.inputField}
                            value={corporateName}
                            onChange={(e) => setCorporateName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Event Date</label>
                        <input
                            required
                            type="date"
                            className={styles.inputField}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Expected Guest Count</label>
                        <input
                            required
                            type="number"
                            className={styles.inputField}
                            value={expectedCount}
                            onChange={(e) => setExpectedCount(e.target.value)}
                            placeholder="e.g. 150"
                        />
                    </div>
                </div>

                <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                    <label>Import Guest List (Excel/CSV)</label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Ensure your file has columns for: Name, Mobile, Email
                    </p>

                    <div
                        className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ""}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {!fileUploaded ? (
                            <>
                                <div className={styles.uploadIcon}>📄</div>
                                <div className={styles.uploadText}>
                                    Drag and drop your file here or
                                </div>
                                <label style={{ display: 'inline-block', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 500 }}>
                                    Browse Files
                                    <input
                                        type="file"
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </>
                        ) : (
                            <div style={{ color: '#34d399', fontWeight: 500 }}>
                                ✅ File ready for import.
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }} disabled={loading}>
                        {loading ? "Creating..." : "Create Event & Import"}
                    </button>
                </div>
            </form>
        </div>
    );
}
