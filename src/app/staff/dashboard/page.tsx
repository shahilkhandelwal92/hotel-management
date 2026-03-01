"use client";

import { useState, useEffect } from "react";
import styles from "../staff.module.css";

// Mocks
const LEAVE_BALANCES = [
    { type: "Sick Leave", taken: 2, total: 12 },
    { type: "Casual Leave", taken: 5, total: 10 },
    { type: "Earned Leave", taken: 0, total: 15 },
];

const LEAVE_HISTORY = [
    { id: "1", type: "Casual Leave", date: "20 Oct - 22 Oct", status: "Approved" },
    { id: "2", type: "Sick Leave", date: "12 Oct - 14 Oct", status: "Approved" },
];

export default function StaffDashboardPage() {
    const [currentTime, setCurrentTime] = useState("");
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchTime, setPunchTime] = useState("");
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // Lead Capture state
    const [leadName, setLeadName] = useState("");
    const [leadContact, setLeadContact] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadSuccess, setLeadSuccess] = useState("");

    const [guestRequests, setGuestRequests] = useState([
        { id: "req_1", guest: "Arjun Sharma", room: "402", type: "Extra Bed", status: "Pending", amount: 0 }
    ]);
    const [chargeAmount, setChargeAmount] = useState<Record<string, number>>({});

    const handleApproveRequest = (id: string) => {
        setGuestRequests(guestRequests.map(r =>
            r.id === id ? { ...r, status: "Approved", amount: chargeAmount[id] || 0 } : r
        ));
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handlePunch = () => {
        if (!isPunchedIn) {
            setPunchTime(new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }));
            setIsPunchedIn(true);
        } else {
            setIsPunchedIn(false);
            setPunchTime("");
        }
    };

    const handleCaptureLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setLeadLoading(true);
        setLeadSuccess("");
        const res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotelName: leadName, contactPerson: leadContact, contactMobile: leadPhone, estimatedValue: 0 })
        });
        if (res.ok) {
            setLeadSuccess("Lead captured successfully!");
            setLeadName(""); setLeadContact(""); setLeadPhone("");
            setTimeout(() => setLeadSuccess(""), 3000);
        }
        setLeadLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <h1 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '2rem' }}>Welcome back, Arjun</h1>

            <div className={styles.dashboardGrid}>
                {/* Main Content Area */}
                <div>
                    <div className={styles.widget}>
                        <h2 className={styles.widgetTitle}>Live Guest Requests</h2>
                        {guestRequests.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active requests.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                {guestRequests.map(req => (
                                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.type}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Room {req.room} • {req.guest}</div>
                                            <div style={{ fontSize: '0.85rem', color: req.status === 'Pending' ? '#f59e0b' : '#10b981', marginTop: '0.2rem' }}>Status: {req.status}</div>
                                            {req.status === 'Approved' && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Charge Applied: ₹{req.amount}</div>}
                                        </div>
                                        {req.status === "Pending" && (
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Add Charge (₹)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="e.g. 1000"
                                                        value={chargeAmount[req.id] || ""}
                                                        onChange={(e) => setChargeAmount({ ...chargeAmount, [req.id]: Number(e.target.value) })}
                                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', width: '100px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleApproveRequest(req.id)}
                                                    className={`${styles.primaryBtn}`}
                                                    style={{ padding: '0.5rem 1rem', height: 'fit-content', marginTop: '1.2rem', width: 'auto' }}
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.widget}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className={styles.widgetTitle} style={{ margin: 0 }}>Leave Balances</h2>
                            <button
                                className={styles.primaryBtn}
                                style={{ width: 'auto' }}
                                onClick={() => setShowLeaveModal(true)}
                            >
                                + Apply Leave
                            </button>
                        </div>

                        <div className={styles.statGrid}>
                            {LEAVE_BALANCES.map((leave) => (
                                <div key={leave.type} className={styles.statCard}>
                                    <div className={styles.statValue}>{leave.total - leave.taken}</div>
                                    <div className={styles.statLabel}>{leave.type}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        {leave.taken} used of {leave.total}
                                    </div>
                                    {/* Progress Bar */}
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '1rem', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(leave.taken / leave.total) * 100}%`,
                                            height: '100%',
                                            background: 'var(--accent-gold)'
                                        }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.widget}>
                        <h2 className={styles.widgetTitle}>Recent Leave History</h2>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>Leave Type</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>Date Range</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEAVE_HISTORY.map((h) => (
                                        <tr key={h.id}>
                                            <td style={{ padding: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>{h.type}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>{h.date}</td>
                                            <td style={{ padding: '1rem', color: '#10b981', borderBottom: '1px solid var(--border-color)' }}>{h.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Area */}
                <div>
                    <div className={styles.widget}>
                        <h2 className={styles.widgetTitle}>Time Tracking</h2>
                        <div className={styles.punchWidget}>
                            <div className={styles.clock}>
                                {currentTime || "00:00:00"}
                            </div>

                            <button
                                className={`${styles.punchBtn} ${isPunchedIn ? styles.punchOut : styles.punchIn}`}
                                onClick={handlePunch}
                            >
                                {isPunchedIn ? "Punch Out" : "Punch In"}
                            </button>

                            {isPunchedIn && (
                                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Punched in since {punchTime}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={styles.widget} style={{ marginTop: '2rem' }}>
                        <h2 className={styles.widgetTitle}>Capture Walk-in Lead</h2>
                        <form onSubmit={handleCaptureLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {leadSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>{leadSuccess}</div>}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Event / Company Name</label>
                                <input required value={leadName} onChange={e => setLeadName(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="e.g. Smith Wedding" />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Contact Person</label>
                                <input required value={leadContact} onChange={e => setLeadContact(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="John Smith" />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Phone Number</label>
                                <input required value={leadPhone} onChange={e => setLeadPhone(e.target.value)} type="tel" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="+91 9876543210" />
                            </div>

                            <button type="submit" disabled={leadLoading} className={styles.primaryBtn} style={{ marginTop: '0.5rem' }}>
                                {leadLoading ? "Saving..." : "Send to CRM"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Leave Application Modal */}
            {showLeaveModal && (
                <div className={styles.modalOverlay}>
                    <div className={`animate-fade-in ${styles.modalContent}`}>
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Apply for Leave</h2>

                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Leave Type</label>
                        <select className={styles.inputField} style={{ appearance: 'none' }}>
                            <option>Sick Leave</option>
                            <option>Casual Leave</option>
                            <option>Earned Leave</option>
                        </select>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>From Date</label>
                                <input type="date" className={styles.inputField} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>To Date</label>
                                <input type="date" className={styles.inputField} />
                            </div>
                        </div>

                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Reason</label>
                        <textarea className={styles.inputField} rows={3} placeholder="Please provide a brief reason..."></textarea>

                        <div style={{ marginTop: '1rem' }}>
                            <button className={styles.primaryBtn} onClick={() => {
                                alert("Leave application submitted to HR!");
                                setShowLeaveModal(false);
                            }}>Submit Application</button>
                            <button className={styles.cancelBtn} onClick={() => setShowLeaveModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
