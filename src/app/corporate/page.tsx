"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./corporate.module.css";
import React from "react";
import { mockEvents } from "@/lib/mockData";

export default function CorporateLoginPage() {
    const [accessCode, setAccessCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`/api/events/verify/${accessCode.toUpperCase()}`);
            const data = await res.json();

            if (res.ok) {
                router.push(`/corporate/${data.eventId}`);
            } else {
                setError(data.error || "Invalid Access Code. Please check and try again.");
            }
        } catch (err) {
            setError("Server connection failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleLogin} className={`glass-panel animate-fade-in ${styles.loginCard}`}>
                <div className={styles.header}>
                    <h2>Corporate Access</h2>
                    <p>Enter your event access code to view live attendance.</p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.formGroup}>
                    <label htmlFor="accessCode">Access Code</label>
                    <input
                        id="accessCode"
                        type="text"
                        required
                        className={styles.inputField}
                        placeholder="e.g. TECH2026"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        style={{ textTransform: 'uppercase' }}
                    />
                </div>

                <button
                    type="submit"
                    className={`btn-primary ${styles.submitBtn}`}
                    disabled={loading}
                >
                    {loading ? "Verifying..." : "View Live Dashboard"}
                </button>
            </form>
        </div>
    );
}
