"use client";
import { useState, useEffect } from "react";

export function DemoModeBanner() {
    const [demoMode, setDemoMode] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/settings/demo-mode").then(r => r.json()).then(d => setDemoMode(d.demoMode));
    }, []);

    const toggle = async () => {
        setSaving(true);
        const next = !demoMode;
        await fetch("/api/settings/demo-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ demoMode: next }),
        });
        setDemoMode(next);
        setSaving(false);
        // Reload page so all data re-fetches with new mode
        window.location.reload();
    };

    if (demoMode === null) return null;

    return (
        <div style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "0.4rem 1rem",
            background: demoMode ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.1)",
            borderBottom: `1px solid ${demoMode ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
            fontSize: "0.8rem",
            fontWeight: 600,
        }}>
            <span style={{ color: demoMode ? "#f59e0b" : "#10b981" }}>
                {demoMode ? "🧪 DEMO MODE — Changes are safe, using sample data" : "🟢 LIVE MODE — Changes affect real production data"}
            </span>
            <button
                onClick={toggle}
                disabled={saving}
                style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    border: `1px solid ${demoMode ? "#f59e0b" : "#10b981"}`,
                    background: "none",
                    color: demoMode ? "#f59e0b" : "#10b981",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                }}
            >
                {saving ? "Switching..." : demoMode ? "Switch to Live Mode" : "Switch to Demo Mode"}
            </button>
        </div>
    );
}
