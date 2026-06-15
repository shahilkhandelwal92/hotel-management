"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Circle, AlertCircle, ArrowRight, Building2, Bed, Receipt, Users, Moon, ShoppingCart, CalendarCheck } from "lucide-react";

interface OnboardStep {
    key: string;
    label: string;
    desc: string;
    completed: boolean;
}
interface OnboardStatus {
    percentage: number;
    completedCount: number;
    totalSteps: number;
    isComplete: boolean;
    steps: OnboardStep[];
    nextStep: OnboardStep | null;
}

const ICONS: Record<string, React.ReactNode> = {
    hotel_details: <Building2 size={20} />,
    rooms_added: <Bed size={20} />,
    tax_configured: <Receipt size={20} />,
    staff_invited: <Users size={20} />,
    night_audit_done: <Moon size={20} />,
    pos_configured: <ShoppingCart size={20} />,
    first_reservation: <CalendarCheck size={20} />,
};

const ROUTES: Record<string, string> = {
    hotel_details: "/admin/settings",
    rooms_added: "/admin/rooms",
    tax_configured: "/admin/accounting/tax-config",
    staff_invited: "/admin/users",
    night_audit_done: "/admin/night-audit",
    pos_configured: "/admin/pos/menu",
    first_reservation: "/admin/reservations/new",
};

export default function OnboardingPage() {
    const [data, setData] = useState<OnboardStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/onboarding/status")
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
    if (!data) return null;

    return (
        <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    🏨 Hotel Setup Checklist
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    Complete these steps to get your hotel fully operational.
                </p>
            </div>

            {/* Progress bar */}
            <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {data.completedCount} of {data.totalSteps} steps complete
                    </span>
                    <span style={{
                        fontWeight: 700, fontSize: "1.1rem",
                        color: data.percentage === 100 ? "#22c55e" : data.percentage >= 50 ? "#f59e0b" : "#ef4444"
                    }}>
                        {data.percentage}%
                    </span>
                </div>
                <div style={{ height: 10, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${data.percentage}%`,
                        background: data.percentage === 100
                            ? "linear-gradient(90deg, #22c55e, #16a34a)"
                            : data.percentage >= 50
                                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                                : "linear-gradient(90deg, #ef4444, #dc2626)",
                        transition: "width 0.8s ease",
                    }} />
                </div>
                {data.isComplete && (
                    <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#dcfce7", borderRadius: 8, color: "#166534", fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
                        ✅ Your hotel is fully configured and ready to onboard guests!
                    </div>
                )}
                {!data.isComplete && data.nextStep && (
                    <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "var(--surface-3)", borderRadius: 8, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                            Next: <strong style={{ color: "var(--text-primary)" }}>{data.nextStep.label}</strong>
                        </span>
                        <a href={ROUTES[data.nextStep.key] ?? "#"} style={{ display: "flex", alignItems: "center", gap: 4, color: "#6366f1", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                            Go <ArrowRight size={14} />
                        </a>
                    </div>
                )}
            </div>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.steps.map((step, i) => (
                    <a
                        key={step.key}
                        href={ROUTES[step.key] ?? "#"}
                        style={{
                            display: "flex", alignItems: "center", gap: "1rem",
                            padding: "1rem 1.25rem", borderRadius: 10,
                            background: step.completed ? "rgba(34,197,94,0.06)" : "var(--surface-2)",
                            border: `1.5px solid ${step.completed ? "rgba(34,197,94,0.25)" : "var(--border)"}`,
                            textDecoration: "none", transition: "all 0.2s ease",
                            cursor: step.completed ? "default" : "pointer",
                            opacity: step.completed ? 0.85 : 1,
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: 40, height: 40, borderRadius: "50%",
                            background: step.completed ? "rgba(34,197,94,0.15)" : "var(--surface-3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: step.completed ? "#22c55e" : "var(--text-muted)",
                            flexShrink: 0,
                        }}>
                            {ICONS[step.key]}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontWeight: 600, fontSize: "0.95rem",
                                color: step.completed ? "var(--text-muted)" : "var(--text-primary)",
                                textDecoration: step.completed ? "line-through" : "none",
                            }}>
                                {i + 1}. {step.label}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 2 }}>
                                {step.desc}
                            </div>
                        </div>

                        {/* Status icon */}
                        <div style={{ flexShrink: 0, color: step.completed ? "#22c55e" : "var(--text-muted)" }}>
                            {step.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                        </div>
                    </a>
                ))}
            </div>

            {/* Help callout */}
            <div style={{ marginTop: "2rem", padding: "1rem 1.25rem", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <AlertCircle size={16} style={{ color: "#6366f1", marginTop: 2, flexShrink: 0 }} />
                <span>
                    Need help? Use the <strong style={{ color: "var(--text-primary)" }}>💬 Feedback</strong> button in the navigation to report any issue. Our team monitors feedback daily.
                </span>
            </div>
        </div>
    );
}
