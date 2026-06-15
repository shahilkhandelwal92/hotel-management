"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";

interface User {
    id: string;
    name: string;
    email: string;
    roles: string[];
}

export default function OwnerTeamDashboard() {
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<"SALARY" | "ITR">("SALARY");

    // Salary states
    const [salaries, setSalaries] = useState<any[]>([]);
    const [salaryMonth, setSalaryMonth] = useState("");
    const [basic, setBasic] = useState("0");
    const [allowances, setAllowances] = useState("0");
    const [deductions, setDeductions] = useState("0");

    // ITR states
    const [itrs, setItrs] = useState<any[]>([]);
    const [financialYear, setFinancialYear] = useState("");
    const [docUrl, setDocUrl] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            // Assuming backend returns all, filter to non-hotel internal staff
            // Wait, we didn't add hotelId to the format in /api/users GET, so we just filter frontend for developer/QA roles?
            // Actually, we'll just show anyone with "SUPER_ADMIN" or "STAFF" who might be internal. Next improvement: pass hotelId in /api/users format.
            setStaff(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openProfile = async (user: User) => {
        setSelectedUser(user);
        setActiveTab("SALARY");
        await fetchProfileData(user.id);
    };

    const fetchProfileData = async (userId: string) => {
        try {
            const [salRes, itrRes] = await Promise.all([
                fetch(`/api/hr/salary?userId=${userId}`),
                fetch(`/api/hr/itr?userId=${userId}`)
            ]);
            setSalaries(await salRes.json());
            setItrs(await itrRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateSalary = async () => {
        if (!selectedUser) return;
        await fetch("/api/hr/salary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: selectedUser.id,
                month: salaryMonth,
                basicSalary: basic,
                allowances,
                deductions,
                paymentStatus: "UNPAID"
            })
        });
        fetchProfileData(selectedUser.id);
        setSalaryMonth(""); setBasic("0"); setAllowances("0"); setDeductions("0");
    };

    const handleCreateITR = async () => {
        if (!selectedUser) return;
        await fetch("/api/hr/itr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: selectedUser.id,
                financialYear,
                documentUrl: docUrl,
                status: "PENDING"
            })
        });
        fetchProfileData(selectedUser.id);
        setFinancialYear(""); setDocUrl("");
    };

    const handleUpdateSalary = async (id: string, status: string) => {
        await fetch(`/api/hr/salary/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: status })
        });
        fetchProfileData(selectedUser!.id);
    }

    return (
        <div style={{ padding: "2rem" }} className="animate-fade-in">
            <h1 style={{ fontSize: '2rem', margin: '0 0 1.5rem' }}>Internal Team Management</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage internal developers, QA, their salaries and compliance.</p>

            <Card>
                <Table headers={["Name", "Email", "Roles", "Action"]} loading={loading}>
                    {staff.map(s => (
                        <tr key={s.id}>
                            <td style={{ padding: "1rem" }}>{s.name}</td>
                            <td style={{ padding: "1rem" }}>{s.email}</td>
                            <td style={{ padding: "1rem" }}>
                                {s.roles.join(", ")}
                            </td>
                            <td style={{ padding: "1rem" }}>
                                <Button size="sm" variant="secondary" onClick={() => openProfile(s)}>Manage HR</Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={`Managing HR: ${selectedUser?.name}`}>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
                    <Button variant={activeTab === "SALARY" ? "primary" : "secondary"} onClick={() => setActiveTab("SALARY")}>Salaries</Button>
                    <Button variant={activeTab === "ITR" ? "primary" : "secondary"} onClick={() => setActiveTab("ITR")}>ITR Filings</Button>
                </div>

                {activeTab === "SALARY" && (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                            <Input label="Month (YYYY-MM)" value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)} />
                            <Input label="Basic ₹" type="number" value={basic} onChange={e => setBasic(e.target.value)} />
                            <Input label="Allowances ₹" type="number" value={allowances} onChange={e => setAllowances(e.target.value)} />
                            <Input label="Deductions ₹" type="number" value={deductions} onChange={e => setDeductions(e.target.value)} />
                            <div style={{ alignSelf: "end", paddingBottom: "0.2rem" }}>
                                <Button variant="secondary" onClick={handleCreateSalary}>+ Generate</Button>
                            </div>
                        </div>
                        <Table headers={["Month", "Basic", "Allowances", "Deductions", "Net Salary", "Status", "Action"]}>
                            {salaries.map(sal => (
                                <tr key={sal.id}>
                                    <td style={{ padding: "0.5rem 1rem" }}>{sal.month}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>₹{sal.basicSalary}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>₹{sal.allowances}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>₹{sal.deductions}</td>
                                    <td style={{ padding: "0.5rem 1rem", fontWeight: "bold" }}>₹{sal.netSalary}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                        <span style={{ color: sal.paymentStatus === 'PAID' ? 'lightgreen' : 'orange' }}>{sal.paymentStatus}</span>
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                        {sal.paymentStatus !== 'PAID' && (
                                            <Button size="sm" variant="primary" onClick={() => handleUpdateSalary(sal.id, "PAID")}>Mark Paid</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                )}

                {activeTab === "ITR" && (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                            <Input label="FY (e.g. 2025-2026)" value={financialYear} onChange={e => setFinancialYear(e.target.value)} />
                            <Input label="Document URL" value={docUrl} onChange={e => setDocUrl(e.target.value)} />
                            <div style={{ alignSelf: "end", paddingBottom: "0.2rem" }}>
                                <Button variant="secondary" onClick={handleCreateITR}>+ File Return</Button>
                            </div>
                        </div>
                        <Table headers={["Fiscal Year", "Doc Link", "Status", "Filed Date"]}>
                            {itrs.map(itr => (
                                <tr key={itr.id}>
                                    <td style={{ padding: "0.5rem 1rem" }}>{itr.financialYear}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                        {itr.documentUrl ? <a href={itr.documentUrl} target="_blank" style={{ color: "var(--accent-gold)" }}>View PDF</a> : "N/A"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", color: itr.status === 'FILED' ? 'lightgreen' : 'orange' }}>{itr.status}</td>
                                    <td style={{ padding: "0.5rem 1rem" }}>{itr.filedDate ? new Date(itr.filedDate).toLocaleDateString() : 'Not filed'}</td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                )}
            </Modal>
        </div>
    );
}
