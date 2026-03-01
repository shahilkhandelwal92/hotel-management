"use client";
import { useState, useEffect } from "react";

const BACKGROUNDS = [
    { label: "None", value: "" },
    { label: "Mountain", value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80" },
    { label: "Ocean", value: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80" },
    { label: "Forest", value: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80" },
    { label: "City", value: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80" },
    { label: "Desert", value: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80" },
    { label: "Aurora", value: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80" },
];

const ACCENT_COLORS = [
    { label: "Gold", primary: "#c9a96e", sidebar: "#1a1612" },
    { label: "Blue", primary: "#3b82f6", sidebar: "#0f172a" },
    { label: "Emerald", primary: "#10b981", sidebar: "#0f2419" },
    { label: "Purple", primary: "#8b5cf6", sidebar: "#1a0f2e" },
    { label: "Rose", primary: "#f43f5e", sidebar: "#2e0f17" },
    { label: "Cyan", primary: "#06b6d4", sidebar: "#0a1f26" },
];

interface ThemeSettings {
    accentColor: string;
    sidebarBg: string;
    backgroundImage: string;
    customBg: string;
}

const DEFAULT_THEME: ThemeSettings = { accentColor: "#c9a96e", sidebarBg: "#1a1612", backgroundImage: "", customBg: "" };

function applyTheme(s: ThemeSettings) {
    document.documentElement.style.setProperty("--accent-gold", s.accentColor);
    document.documentElement.style.setProperty("--sidebar-bg", s.sidebarBg);
    const bg = s.customBg || s.backgroundImage;
    document.body.style.backgroundImage = bg ? `url('${bg}')` : "";
    document.body.style.backgroundSize = bg ? "cover" : "";
    document.body.style.backgroundAttachment = bg ? "fixed" : "";
}

// Called globally (without login) to apply server theme
export async function loadAndApplyServerTheme() {
    try {
        const res = await fetch("/api/settings/theme");
        if (res.ok) {
            const theme = await res.json();
            applyTheme({ ...DEFAULT_THEME, ...theme });
            localStorage.setItem("hotel_theme_cache", JSON.stringify(theme));
        }
    } catch { /* ignored */ }
}

export function ThemeCustomizer({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load from cache first (fast), then sync from server
        const cached = localStorage.getItem("hotel_theme_cache");
        if (cached) {
            const theme = JSON.parse(cached);
            setSettings(theme);
            applyTheme(theme);
        }
        // Always fetch fresh from server (applies to all users)
        fetch("/api/settings/theme")
            .then(r => r.json())
            .then(theme => {
                setSettings({ ...DEFAULT_THEME, ...theme });
                applyTheme({ ...DEFAULT_THEME, ...theme });
                localStorage.setItem("hotel_theme_cache", JSON.stringify(theme));
            }).catch(() => { });
    }, []);

    const update = (partial: Partial<ThemeSettings>) => {
        const next = { ...settings, ...partial };
        setSettings(next);
        applyTheme(next);
    };

    const saveToServer = async () => {
        setSaving(true);
        try {
            await fetch("/api/settings/theme", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            localStorage.setItem("hotel_theme_cache", JSON.stringify(settings));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        setSettings(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        await fetch("/api/settings/theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(DEFAULT_THEME),
        });
        localStorage.setItem("hotel_theme_cache", JSON.stringify(DEFAULT_THEME));
    };

    return (
        <>
            <button onClick={() => setOpen(!open)} title="Customize Theme" style={{
                position: "fixed", bottom: "2rem", right: open ? "21rem" : "1.5rem",
                width: 44, height: 44, borderRadius: "50%",
                background: "var(--accent-gold)", border: "none",
                cursor: "pointer", fontSize: "1.1rem", zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                transition: "right 0.3s ease",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>⚙️</button>

            <div style={{
                position: "fixed", top: 0, right: open ? 0 : "-340px",
                width: 320, height: "100vh", background: "var(--bg-secondary)",
                borderLeft: "1px solid var(--border-color)", zIndex: 999,
                transition: "right 0.3s ease", overflowY: "auto", padding: "1.5rem",
                boxShadow: open ? "-4px 0 20px rgba(0,0,0,0.2)" : "none",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>🎨 Customize Theme</h3>
                        {isSuperAdmin && <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--text-secondary)" }}>Applies to all staff & roles</p>}
                    </div>
                    <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-secondary)" }}>✕</button>
                </div>

                {/* Accent Colors */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accent Color</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                        {ACCENT_COLORS.map(c => (
                            <button key={c.label} onClick={() => update({ accentColor: c.primary, sidebarBg: c.sidebar })} style={{
                                padding: "0.5rem", border: settings.accentColor === c.primary ? `2px solid ${c.primary}` : "2px solid transparent",
                                borderRadius: "8px", background: "var(--bg-primary)", cursor: "pointer",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                            }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.primary, boxShadow: `0 0 0 3px ${c.sidebar}` }}></div>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{c.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Backgrounds */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Background</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                        {BACKGROUNDS.map(bg => (
                            <button key={bg.label} onClick={() => update({ backgroundImage: bg.value, customBg: "" })} style={{
                                height: 56, borderRadius: "8px",
                                border: settings.backgroundImage === bg.value && !settings.customBg ? "2px solid var(--accent-gold)" : "2px solid var(--border-color)",
                                cursor: "pointer", overflow: "hidden",
                                background: bg.value ? `url('${bg.value}') center/cover` : "var(--bg-primary)",
                                color: bg.value ? "white" : "var(--text-primary)",
                                fontWeight: 600, fontSize: "0.78rem",
                                textShadow: bg.value ? "0 1px 3px rgba(0,0,0,0.8)" : "none",
                            }}>{bg.label}</button>
                        ))}
                    </div>
                </div>

                {/* Custom URL */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom Image URL</div>
                    <input type="url" placeholder="https://..." value={settings.customBg}
                        onChange={e => update({ customBg: e.target.value, backgroundImage: "" })}
                        style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                </div>

                {/* Save button — visible to all, but label changes */}
                {isSuperAdmin && (
                    <button onClick={saveToServer} disabled={saving} style={{
                        width: "100%", padding: "0.75rem", borderRadius: "8px", border: "none",
                        background: saved ? "#10b981" : "var(--accent-gold)",
                        color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem",
                        marginBottom: "0.5rem", transition: "background 0.2s",
                    }}>
                        {saving ? "Saving..." : saved ? "✓ Saved for all staff!" : "💾 Save for All Users"}
                    </button>
                )}

                <button onClick={reset} style={{
                    width: "100%", padding: "0.65rem", borderRadius: "8px",
                    border: "1px solid var(--border-color)", background: "none",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.82rem",
                }}>Reset to Default</button>
            </div>

            {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />}
        </>
    );
}
