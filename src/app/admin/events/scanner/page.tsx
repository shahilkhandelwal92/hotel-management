"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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
        <div className="animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>Event Access Control</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.6rem', fontSize: '1.1rem' }}>
                    Scan guest QR codes to instantly verify eligibility and register attendance.
                </p>
            </div>

            <Card style={{ padding: '3rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <div style={{
                    width: '300px',
                    height: '300px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    background: 'rgba(0,0,0,0.4)',
                    boxShadow: status === 'success' ? '0 0 30px rgba(16, 185, 129, 0.4)' : status === 'scanning' ? '0 0 30px rgba(180, 150, 80, 0.2)' : 'none',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden'
                }}>
                    {status === "idle" && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                            <div style={{ fontWeight: 600 }}>Camera Ready</div>
                        </div>
                    )}
                    {status === "scanning" && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%', height: '2px', background: 'var(--accent-gold)', position: 'absolute', top: '0', animation: 'scan-line 2s infinite linear' }} />
                            <div style={{ fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '2px' }}>SCANNING</div>
                        </div>
                    )}
                    {status === "success" && (
                        <div style={{ textAlign: 'center', padding: '1rem', animation: 'scale-in 0.3s ease-out' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✅</div>
                            <Badge variant="success" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>Access Granted</Badge>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '2.5rem', width: '100%' }}>
                    {status === "success" && (
                        <div style={{ marginBottom: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Identified Guest</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{scannedResult}</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        {status !== "success" ? (
                            <Button variant="primary" size="lg" onClick={handleScanSimulate} loading={status === "scanning"} style={{ width: '100%' }}>
                                {status === "scanning" ? "Scanning..." : "Simulate Scan"}
                            </Button>
                        ) : (
                            <Button variant="outline" size="lg" onClick={resetScanner} style={{ width: '100%' }}>
                                Scan Next Guest
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <style jsx>{`
                @keyframes scan-line {
                    0% { top: 0% }
                    50% { top: 100% }
                    100% { top: 0% }
                }
                @keyframes scale-in {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
