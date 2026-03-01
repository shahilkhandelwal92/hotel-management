"use client";

import { useState } from "react";
import styles from "../hr.module.css";

// Mock Data for Leave Types
const MOCK_LEAVE_TYPES = [
    { id: "1", name: "Sick Leave", days: 12 },
    { id: "2", name: "Casual Leave", days: 10 },
    { id: "3", name: "Earned Leave", days: 15 },
];

export default function HRLeaveSettingsPage() {
    const [leaveTypes, setLeaveTypes] = useState(MOCK_LEAVE_TYPES);
    const [newType, setNewType] = useState("");
    const [newDays, setNewDays] = useState(0);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newType || newDays <= 0) return;
        setLeaveTypes([...leaveTypes, { id: Date.now().toString(), name: newType, days: newDays }]);
        setNewType("");
        setNewDays(0);
    };

    return (
        <div className={styles.hrContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Leave Policy Settings</h1>
                    <p>Configure the default annual leave allowances for your staff.</p>
                </div>
            </div>

            <div className={styles.card} style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                    <h2 className={styles.cardTitle}>Current Policies</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Annual Allowance (Days)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveTypes.map((lt) => (
                                    <tr key={lt.id}>
                                        <td>{lt.name}</td>
                                        <td>{lt.days}</td>
                                        <td>
                                            <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => setLeaveTypes(leaveTypes.filter(l => l.id !== lt.id))}>
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ width: '300px' }}>
                    <h2 className={styles.cardTitle}>Add New Policy</h2>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Leave Name</label>
                            <input
                                type="text"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                className={styles.inputField}
                                placeholder="e.g. Maternity Leave"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Days Allowed</label>
                            <input
                                type="number"
                                value={newDays}
                                onChange={(e) => setNewDays(Number(e.target.value))}
                                className={styles.inputField}
                                min="1"
                            />
                        </div>
                        <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                            Save Policy
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
