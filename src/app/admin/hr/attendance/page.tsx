"use client";

import { useState, useEffect } from "react";
import styles from "../hr.module.css";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

const DEMO = [
    { id: "d1", name: "Arjun Sharma", role: "Front Desk", checkIn: "08:45 AM", checkOut: "--", status: "Present" },
    { id: "d2", name: "Priya Patel", role: "Housekeeping", checkIn: "06:30 AM", checkOut: "03:15 PM", status: "Present" },
    { id: "d3", name: "Rohan Singh", role: "Chef", checkIn: "--", checkOut: "--", status: "Absent" },
    { id: "d4", name: "Neha Gupta", role: "Manager", checkIn: "09:15 AM", checkOut: "--", status: "Half-Day" },
];

export default function HRAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    useEffect(() => {
        fetch("/api/attendance")
            .then(r => r.json())
            .then(d => {
                if (d.records?.length) setRecords(d.records);
                else setRecords(DEMO);
                setLoading(false);
            })
            .catch(() => { setRecords(DEMO); setLoading(false); });
    }, []);

    const exportCSV = () => {
        const rows = [["Staff", "Role", "Punch In", "Punch Out", "Status"], ...records.map(r => [r.name, r.role, r.checkIn, r.checkOut, r.status])];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    return (
        <div className={styles.hrContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Daily Attendance</h1>
                    <p>Live overview of staff presence for {today}.</p>
                </div>
                <button onClick={exportCSV} style={{ padding: "0.55rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    ⬇️ Export CSV
                </button>
            </div>

            {/* Summary badges */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                {[
                    { label: "Present", color: "#10b981", count: records.filter(r => r.status === "Present").length },
                    { label: "Absent", color: "#ef4444", count: records.filter(r => r.status === "Absent").length },
                    { label: "Half-Day", color: "#f59e0b", count: records.filter(r => r.status === "Half-Day").length },
                ].map(s => (
                    <div key={s.label} style={{ padding: "0.6rem 1rem", borderRadius: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Live Punch Feed {loading && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>(loading...)</span>}</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Role</th>
                                <th>Punch In</th>
                                <th>Punch Out</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(record => (
                                <tr key={record.id}>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{record.name}</td>
                                    <td style={{ color: "var(--text-secondary)" }}>{record.role}</td>
                                    <td style={{ fontFamily: "monospace" }}>{record.checkIn}</td>
                                    <td style={{ fontFamily: "monospace" }}>{record.checkOut}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${record.status === "Present" ? styles.statusApproved : record.status === "Absent" ? styles.statusRejected : styles.statusPending}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
