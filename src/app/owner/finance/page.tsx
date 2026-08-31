"use client";

import { useState, useEffect } from "react";
import styles from "../leads/leads.module.css";

type FYReportAgg = {
    financialYear: string;
    totalRevenue: number;
    totalExpenses: number;
    hotelsCount: number;
};

export default function FinanceDashboard() {
    const [reports, setReports] = useState<FYReportAgg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFinance = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/finance");
            if (res.ok) {
                const data = await res.json();
                if (data.aggregated && data.aggregated.length > 0) {
                    setReports(data.aggregated);
                } else {
                    setReports([]);
                }
            } else {
                setError("Unable to load financial data from server.");
            }
        } catch {
            setError("Network error while loading financial records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinance();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Loading live financial records...</div>;

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div className={styles.header}>
                <h1>High-Level Fiscal Reporting</h1>
                <p style={{ color: "var(--text-secondary)" }}>Aggregated revenue and operational expenses across the entire hotel portfolio.</p>
            </div>

            {error && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444" }}>
                    <p>{error}</p>
                    <button
                        onClick={fetchFinance}
                        style={{ marginTop: "0.5rem", padding: "0.4rem 1rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!error && reports.length === 0 && (
                <div style={{ marginTop: "2rem", padding: "3rem", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                    <h3>No financial records available yet</h3>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                        Financial statements will populate as invoices and night audits are recorded.
                    </p>
                </div>
            )}

            {reports.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
                    {reports.map((report) => {
                        const profit = report.totalRevenue - report.totalExpenses;
                        const margin = report.totalRevenue > 0 ? ((profit / report.totalRevenue) * 100).toFixed(1) : "0.0";

                        return (
                            <div key={report.financialYear} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "2rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                                <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                                    FY {report.financialYear}
                                    <span style={{ float: "right", fontSize: "0.9rem", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "0.2rem 0.6rem", borderRadius: "12px" }}>{report.hotelsCount} Hotels</span>
                                </h2>

                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Gross Revenue</div>
                                        <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--text-primary)" }}>{formatCurrency(report.totalRevenue)}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Operational Expenses</div>
                                        <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(report.totalExpenses)}</div>
                                    </div>

                                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--border-color)" }}>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Net Profit</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>{formatCurrency(profit)}</div>
                                            <div style={{ fontSize: "1rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>+{margin}% Margin</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
