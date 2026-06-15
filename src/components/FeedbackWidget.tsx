"use client";
import { useState } from "react";
import { MessageCircle, X, Send, Star, ChevronDown } from "lucide-react";

const CATEGORIES = ["Bug Report", "Feature Request", "Billing Issue", "UX Suggestion", "Performance", "General"];

export default function FeedbackWidget() {
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [message, setMessage] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        if (!message.trim()) { setError("Please describe the issue or suggestion."); return; }
        setSending(true); setError("");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, message, rating: rating || null, page: window.location.pathname }),
            });
            if (!res.ok) throw new Error("Failed");
            setSent(true);
            setTimeout(() => { setOpen(false); setSent(false); setMessage(""); setRating(0); }, 2500);
        } catch {
            setError("Couldn't send. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating button */}
            <button
                id="feedback-trigger"
                onClick={() => setOpen((p) => !p)}
                title="Send Feedback"
                style={{
                    position: "fixed", bottom: 24, right: 24, zIndex: 999,
                    width: 52, height: 52, borderRadius: "50%", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.45)", cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
                {open ? <X size={20} /> : <MessageCircle size={20} />}
            </button>

            {/* Panel */}
            {open && (
                <div
                    id="feedback-panel"
                    style={{
                        position: "fixed", bottom: 84, right: 24, zIndex: 998,
                        width: 340, borderRadius: 16, overflow: "hidden",
                        background: "var(--surface-1, #1a1a2e)", border: "1px solid var(--border, rgba(255,255,255,0.1))",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                        animation: "slideUp 0.2s ease",
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", gap: 10 }}>
                        <MessageCircle size={18} color="#fff" />
                        <strong style={{ color: "#fff", fontSize: "0.95rem" }}>Send Feedback</strong>
                    </div>

                    {sent ? (
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
                            <div style={{ color: "var(--text-primary, #fff)", fontWeight: 600 }}>Thank you!</div>
                            <div style={{ color: "var(--text-muted, #aaa)", fontSize: "0.85rem", marginTop: 4 }}>We review all feedback daily.</div>
                        </div>
                    ) : (
                        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                            {/* Category */}
                            <div>
                                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #aaa)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Category
                                </label>
                                <div style={{ position: "relative" }}>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        style={{ width: "100%", padding: "0.6rem 2rem 0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border, rgba(255,255,255,0.12))", background: "var(--surface-2, #252540)", color: "var(--text-primary, #fff)", fontSize: "0.9rem", appearance: "none", cursor: "pointer" }}
                                    >
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted, #aaa)" }} />
                                </div>
                            </div>

                            {/* Star rating */}
                            <div>
                                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #aaa)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Experience Rating
                                </label>
                                <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Star
                                            key={n}
                                            size={24}
                                            style={{
                                                cursor: "pointer", transition: "color 0.15s",
                                                color: n <= (hoverRating || rating) ? "#f59e0b" : "var(--border, rgba(255,255,255,0.12))",
                                                fill: n <= (hoverRating || rating) ? "#f59e0b" : "transparent",
                                            }}
                                            onMouseEnter={() => setHoverRating(n)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(n)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #aaa)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Message *
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe the issue, suggestion, or anything on your mind…"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: 8, border: `1px solid ${error ? "#ef4444" : "var(--border, rgba(255,255,255,0.12))"}`, background: "var(--surface-2, #252540)", color: "var(--text-primary, #fff)", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
                                />
                                {error && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: 4 }}>{error}</p>}
                            </div>

                            {/* Submit */}
                            <button
                                id="feedback-submit"
                                onClick={submit}
                                disabled={sending}
                                style={{
                                    width: "100%", padding: "0.7rem", borderRadius: 8, border: "none",
                                    background: sending ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: sending ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    transition: "opacity 0.2s",
                                }}
                            >
                                {sending ? "Sending…" : <><Send size={15} /> Send Feedback</>}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </>
    );
}
