"use client";

import { useState } from "react";
import styles from "../events.module.css";
import React from "react";

export default function QRScannerPage() {
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");

    const handleScanSimulate = () => {
        setStatus("scanning");
        setTimeout(() => {
            // Mocking a successful scan of a guest
            setScannedResult("Alice Smith (Tech Innovators Summit 2026)");
            setStatus("success");
        }, 1500);
    };

    const resetScanner = () => {
        setScannedResult(null);
        setStatus("idle");
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 className="text-2xl font-bold">Event Entry Scanner</h1>
                <p className="text-secondary">Scan guest QR code to register attendance</p>
            </div>

            <div style={{
                width: '300px',
                height: '300px',
                border: '4px dashed var(--accent-gold)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'rgba(0,0,0,0.5)',
                boxShadow: status === 'success' ? '0 0 20px rgba(52, 211, 153, 0.5)' : 'none',
                transition: 'box-shadow 0.3s'
            }}>
                {status === "idle" && (
                    <div style={{ color: 'var(--text-secondary)' }}>Ready to Scan</div>
                )}
                {status === "scanning" && (
                    <div style={{ color: 'var(--accent-blue)', animation: 'pulse 1.5s infinite' }}>Scanning...</div>
                )}
                {status === "success" && (
                    <div style={{ color: '#34d399', textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <div style={{ fontWeight: 'bold' }}>Access Granted</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#fff' }}>{scannedResult}</div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                {status !== "success" ? (
                    <button className="btn-primary" onClick={handleScanSimulate} disabled={status === "scanning"}>
                        {status === "scanning" ? "Scanning..." : "Simulate Scan"}
                    </button>
                ) : (
                    <button className="btn-secondary" onClick={resetScanner}>
                        Scan Next Guest
                    </button>
                )}
            </div>
        </div>
    );
}
