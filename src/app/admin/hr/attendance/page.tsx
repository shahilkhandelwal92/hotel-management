"use client";

import styles from "../hr.module.css";

// Mock Data for Today's Attendance
const MOCK_ATTENDANCE = [
    { id: "emp_1", name: "Arjun Sharma", role: "Front Desk", checkIn: "08:45 AM", checkOut: "--", status: "Present" },
    { id: "emp_2", name: "Priya Patel", role: "Housekeeping", checkIn: "06:30 AM", checkOut: "03:15 PM", status: "Present" },
    { id: "emp_3", name: "Rohan Singh", role: "Chef", checkIn: "--", checkOut: "--", status: "Absent" },
    { id: "emp_4", name: "Neha Gupta", role: "Manager", checkIn: "09:15 AM", checkOut: "--", status: "Half-Day" },
];

export default function HRAttendancePage() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className={styles.hrContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Daily Attendance</h1>
                    <p>Live overview of staff presence for {today}.</p>
                </div>
            </div>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Live Punch Feed</h2>
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
                            {MOCK_ATTENDANCE.map((record) => (
                                <tr key={record.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{record.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{record.role}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{record.checkIn}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{record.checkOut}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${record.status === 'Present' ? styles.statusApproved :
                                                record.status === 'Absent' ? styles.statusRejected : styles.statusPending
                                            }`}>
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
