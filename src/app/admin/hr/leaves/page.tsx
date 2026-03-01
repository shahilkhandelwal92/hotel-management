"use client";

import { useState } from "react";
import styles from "../hr.module.css";

// Mock Data for Leave Requests
const MOCK_LEAVE_REQUESTS = [
    { id: "req_1", employeeName: "Arjun Sharma", role: "Front Desk", leaveType: "Sick Leave", dates: "12 Oct - 14 Oct", reason: "Viral Fever", status: "Pending" },
    { id: "req_2", employeeName: "Priya Patel", role: "Housekeeping", leaveType: "Casual Leave", dates: "20 Oct - 22 Oct", reason: "Family Function", status: "Approved" },
    { id: "req_3", employeeName: "Rohan Singh", role: "Chef", leaveType: "Earned Leave", dates: "01 Nov - 10 Nov", reason: "Vacation", status: "Pending" },
];

export default function HRLeaveApprovalsPage() {
    const [requests, setRequests] = useState(MOCK_LEAVE_REQUESTS);

    const handleAction = (id: string, newStatus: string) => {
        setRequests(requests.map(req => req.id === id ? { ...req, status: newStatus } : req));
    };

    return (
        <div className={styles.hrContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Leave Approvals</h1>
                    <p>Review and act upon staff leave requests.</p>
                </div>
            </div>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Recent Requests</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Type</th>
                                <th>Duration</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.employeeName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.role}</div>
                                    </td>
                                    <td>{req.leaveType}</td>
                                    <td>{req.dates}</td>
                                    <td>{req.reason}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${req.status === 'Approved' ? styles.statusApproved :
                                                req.status === 'Rejected' ? styles.statusRejected : styles.statusPending
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td>
                                        {req.status === 'Pending' ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => handleAction(req.id, 'Approved')}>Approve</button>
                                                <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => handleAction(req.id, 'Rejected')}>Reject</button>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Iterated</span>
                                        )}
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
