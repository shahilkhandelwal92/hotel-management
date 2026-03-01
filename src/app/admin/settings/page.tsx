"use client";

import { useState } from "react";
import styles from "./settings.module.css";

export default function SettingsPage() {
    const [hasRestaurant, setHasRestaurant] = useState(true);
    const [zomatoLink, setZomatoLink] = useState("");
    const [swiggyLink, setSwiggyLink] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate an API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        alert("Settings saved successfully!");
        setIsSaving(false);
    };

    return (
        <div className={styles.settingsContainer}>
            <div className={styles.header}>
                <h1>Property Settings</h1>
                <p>Configure your hotel features and integrations.</p>
            </div>

            <form onSubmit={handleSave} className="animate-fade-in">
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        🍽️ Food & Dining Configuration
                    </h2>

                    <div className={styles.toggleContainer}>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={hasRestaurant}
                                onChange={(e) => setHasRestaurant(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            We have an In-House Restaurant / Room Service
                        </span>
                    </div>

                    {!hasRestaurant && (
                        <div className="animate-fade-in" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <p style={{ color: "var(--accent-gold)", marginBottom: "1rem" }}>
                                Since you do not have an in-house restaurant, provide links to local delivery services so your guests can easily order food to their room.
                            </p>

                            <div className={styles.formGroup}>
                                <label>Zomato Hotel URL</label>
                                <span className={styles.helpText}>Link to a specific local restaurant or a curated Zomato location page.</span>
                                <input
                                    type="url"
                                    className={styles.inputField}
                                    placeholder="https://www.zomato.com/your-city/local-eats"
                                    value={zomatoLink}
                                    onChange={(e) => setZomatoLink(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Swiggy Hotel URL</label>
                                <span className={styles.helpText}>Link to a specific local restaurant or a curated Swiggy location page.</span>
                                <input
                                    type="url"
                                    className={styles.inputField}
                                    placeholder="https://www.swiggy.com/city/local-eats"
                                    value={swiggyLink}
                                    onChange={(e) => setSwiggyLink(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
