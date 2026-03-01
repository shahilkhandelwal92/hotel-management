"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ width: '36px', height: '36px' }} />; // Placeholder to avoid layout shift
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <button
                onClick={() => setTheme("light")}
                style={{
                    background: theme === 'light' ? 'var(--bg-primary)' : 'transparent',
                    color: theme === 'light' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'light' ? 'var(--glass-shadow)' : 'none'
                }}
                title="Light Mode"
            >
                ☀️
            </button>
            <button
                onClick={() => setTheme("dark")}
                style={{
                    background: theme === 'dark' ? 'var(--bg-primary)' : 'transparent',
                    color: theme === 'dark' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'dark' ? 'var(--glass-shadow)' : 'none'
                }}
                title="Dark Mode"
            >
                🌙
            </button>
            <button
                onClick={() => setTheme("system")}
                style={{
                    background: theme === 'system' ? 'var(--bg-primary)' : 'transparent',
                    color: theme === 'system' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'system' ? 'var(--glass-shadow)' : 'none'
                }}
                title="System Default"
            >
                ⚙️
            </button>
        </div>
    );
}
