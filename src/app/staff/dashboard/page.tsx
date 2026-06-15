"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Banknote,
    BedDouble,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    Coffee,
    FileText,
    HandCoins,
    Sparkles,
    LogIn,
    LogOut,
    Palmtree,
    ReceiptText,
    TimerReset,
    UserRound,
    WalletCards,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "../staff.module.css";

type User = {
    id: string;
    name: string;
    email: string;
    hotelId: string;
    hotel?: { name: string };
    roles: { role: { name: string } }[];
};

type Attendance = {
    id: string;
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status: string;
};

type LeaveBalance = {
    id: string;
    name: string;
    defaultDays: number;
    used: number;
    available: number;
};

type Leave = {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    createdAt: string;
    leaveType: { name: string };
};

type Payroll = {
    id: string;
    month: string;
    paymentStatus: string;
    basicSalary: number;
    hra: number;
    conveyance: number;
    medicalAllowance: number;
    otherAllowances: number;
    grossSalary: number;
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    otherDeductions: number;
    totalDeductions: number;
    netSalary: number;
    workingDays: number;
    lopDays: number;
};

type GuestRequest = {
    id: string;
    requestType: string;
    status: string;
    amount: number;
    createdAt: string;
    guest?: { name: string; roomNumber?: string };
};

const tabs = [
    { id: "overview", label: "Home" },
    { id: "attendance", label: "Attendance" },
    { id: "leave", label: "Leave" },
    { id: "payroll", label: "Payslips" },
    { id: "requests", label: "Guest requests" },
] as const;

function money(value: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function duration(record?: Attendance | null) {
    if (!record?.checkIn) return "0h 00m";
    const end = record.checkOut ? new Date(record.checkOut) : new Date();
    const minutes = Math.max(0, Math.floor((end.getTime() - new Date(record.checkIn).getTime()) / 60_000));
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export default function StaffDashboardPage() {
    const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview");
    const [user, setUser] = useState<User | null>(null);
    const [today, setToday] = useState<Attendance | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [payroll, setPayroll] = useState<Payroll[]>([]);
    const [requests, setRequests] = useState<GuestRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [showLeave, setShowLeave] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState<Payroll | null>(null);
    const [leaveForm, setLeaveForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
    const [requestCharge, setRequestCharge] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        const meResponse = await fetch("/api/auth/me");
        const meData = await meResponse.json();
        if (!meResponse.ok || !meData.user) {
            setError("Your employee session has expired.");
            setLoading(false);
            return;
        }
        setUser(meData.user);

        const [attendanceResponse, leaveResponse, payrollResponse, requestResponse] = await Promise.all([
            fetch("/api/attendance?scope=me"),
            fetch("/api/leaves?scope=me"),
            fetch("/api/payroll"),
            fetch("/api/requests"),
        ]);
        const [attendanceData, leaveData, payrollData, requestData] = await Promise.all([
            attendanceResponse.json(),
            leaveResponse.json(),
            payrollResponse.json(),
            requestResponse.json(),
        ]);
        setToday(attendanceData.today || null);
        setAttendanceHistory(attendanceData.history || []);
        setLeaveBalances(leaveData.balances || []);
        setLeaves(leaveData.leaves || []);
        setPayroll(payrollData.records || []);
        setRequests(requestData.requests || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const punch = async () => {
        const action = today?.checkIn && !today.checkOut ? "punch_out" : "punch_in";
        setBusy(action);
        const response = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Attendance could not be updated.");
        else {
            setNotice(action === "punch_in" ? "You are punched in. Have a great shift." : "Shift closed successfully.");
            await load();
        }
        setBusy("");
    };

    const applyLeave = async () => {
        setBusy("leave");
        const response = await fetch("/api/leaves", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leaveForm),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Leave request could not be submitted.");
        else {
            setNotice("Leave request sent for approval.");
            setShowLeave(false);
            setLeaveForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
            await load();
        }
        setBusy("");
    };

    const approveRequest = async (id: string, status: "Approved" | "InProgress" | "Completed" | "Rejected") => {
        setBusy(id);
        const response = await fetch(`/api/requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, amount: Number(requestCharge[id] || 0) }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Request could not be updated.");
        else {
            setNotice(`Guest request marked ${status.toLowerCase()}.`);
            await load();
        }
        setBusy("");
    };

    const attendanceStats = useMemo(() => ({
        present: attendanceHistory.filter((item) => item.status === "Present").length,
        halfDays: attendanceHistory.filter((item) => item.status === "Half-Day").length,
        hours: attendanceHistory.reduce((sum, item) => {
            if (!item.checkIn || !item.checkOut) return sum;
            return sum + Math.max(0, new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime()) / 3_600_000;
        }, 0),
    }), [attendanceHistory]);
    const latestPayroll = payroll[0];
    const openRequests = requests.filter((request) => !["Completed", "Rejected"].includes(request.status));

    if (loading && !user) return <div className={styles.loading}>Preparing your employee workspace...</div>;

    return (
        <div className="animate-fade-in">
            <section className={styles.welcome}>
                <div>
                    <div className="page-eyebrow">Employee self service</div>
                    <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name.split(" ")[0]}</h1>
                    <p>{user?.hotel?.name} · {user?.roles.map((role) => role.role.name).join(", ")}</p>
                </div>
                <div className={styles.dateBlock}>
                    <strong>{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</strong>
                    <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
            </section>

            {(error || notice) && <div className={error ? styles.alertError : styles.alertSuccess}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}

            <nav className={styles.staffTabs}>
                {tabs.map((tab) => <button key={tab.id} data-active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
            </nav>

            {(activeTab === "overview" || activeTab === "attendance") && (
                <section className={styles.attendanceHero}>
                    <div className={styles.clockCard}>
                        <div className={styles.clockTop}>
                            <span className={today?.checkIn && !today.checkOut ? styles.liveIndicator : styles.offIndicator} />
                            <span>{today?.checkIn && !today.checkOut ? "Shift in progress" : today?.checkOut ? "Shift completed" : "Ready to start"}</span>
                        </div>
                        <strong>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong>
                        <p>{today?.checkIn ? `Started at ${new Date(today.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Punch in when your shift begins."}</p>
                        <Button size="lg" variant={today?.checkIn && !today.checkOut ? "danger" : "primary"} onClick={punch} loading={busy === "punch_in" || busy === "punch_out"} disabled={Boolean(today?.checkOut)}>
                            {today?.checkIn && !today.checkOut ? <><LogOut size={17} /> Punch out</> : today?.checkOut ? <><CheckCircle2 size={17} /> Shift complete</> : <><LogIn size={17} /> Punch in</>}
                        </Button>
                    </div>
                    <div className={styles.shiftSummary}>
                        <div><span><Clock3 size={19} /></span><small>Today&apos;s hours</small><strong>{duration(today)}</strong></div>
                        <div><span><CalendarCheck2 size={19} /></span><small>Present this month</small><strong>{attendanceStats.present} days</strong></div>
                        <div><span><TimerReset size={19} /></span><small>Hours this month</small><strong>{attendanceStats.hours.toFixed(1)}h</strong></div>
                        <div><span><Coffee size={19} /></span><small>Half days</small><strong>{attendanceStats.halfDays}</strong></div>
                    </div>
                </section>
            )}

            {activeTab === "overview" && (
                <div className={styles.overviewGrid}>
                    <section className={styles.panel}>
                        <div className={styles.panelHead}><div><span>Time off</span><h2>Leave balance</h2></div><Button size="sm" onClick={() => setShowLeave(true)}>Apply leave</Button></div>
                        <div className={styles.balanceGrid}>
                            {leaveBalances.slice(0, 4).map((balance, index) => (
                                <div key={balance.id} data-tone={index % 4}>
                                    <Palmtree size={18} />
                                    <strong>{balance.available}</strong>
                                    <span>{balance.name}</span>
                                    <small>{balance.used} used of {balance.defaultDays}</small>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className={styles.panel}>
                        <div className={styles.panelHead}><div><span>Latest salary</span><h2>Payslip</h2></div>{latestPayroll && <Badge variant={latestPayroll.paymentStatus === "Paid" ? "success" : "warning"}>{latestPayroll.paymentStatus}</Badge>}</div>
                        {latestPayroll ? (
                            <div className={styles.payPreview}>
                                <span><WalletCards size={22} /></span>
                                <div><small>{new Date(`${latestPayroll.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</small><strong>{money(latestPayroll.netSalary)}</strong><p>Net pay after {money(latestPayroll.totalDeductions)} deductions</p></div>
                                <button onClick={() => setSelectedPayslip(latestPayroll)}><ArrowRight size={18} /></button>
                            </div>
                        ) : <div className={styles.empty}>No payslip has been published yet.</div>}
                    </section>
                </div>
            )}

            {activeTab === "attendance" && (
                <section className={styles.panel}>
                    <div className={styles.panelHead}><div><span>Monthly log</span><h2>Attendance history</h2></div></div>
                    <div className={styles.historyList}>
                        {attendanceHistory.map((record) => (
                            <div key={record.id}>
                                <span className={styles.dayBox}><strong>{new Date(record.date).getDate()}</strong><small>{new Date(record.date).toLocaleDateString("en-IN", { month: "short" })}</small></span>
                                <div><strong>{new Date(record.date).toLocaleDateString("en-IN", { weekday: "long" })}</strong><small>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--"} to {record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--"}</small></div>
                                <span>{duration(record)}</span>
                                <Badge variant={record.status === "Present" ? "success" : record.status === "Half-Day" ? "warning" : "danger"}>{record.status}</Badge>
                            </div>
                        ))}
                        {attendanceHistory.length === 0 && <div className={styles.empty}>No attendance records this month.</div>}
                    </div>
                </section>
            )}

            {activeTab === "leave" && (
                <section className={styles.panel}>
                    <div className={styles.panelHead}><div><span>Time off</span><h2>Leave requests</h2></div><Button onClick={() => setShowLeave(true)}>Apply leave</Button></div>
                    <div className={styles.balanceGrid}>
                        {leaveBalances.map((balance, index) => (
                            <div key={balance.id} data-tone={index % 4}><Palmtree size={18} /><strong>{balance.available}</strong><span>{balance.name}</span><small>{balance.used} used of {balance.defaultDays}</small></div>
                        ))}
                    </div>
                    <div className={styles.historyList}>
                        {leaves.map((leave) => (
                            <div key={leave.id}>
                                <span className={styles.leaveIcon}><Palmtree size={17} /></span>
                                <div><strong>{leave.leaveType.name}</strong><small>{new Date(leave.startDate).toLocaleDateString("en-IN")} to {new Date(leave.endDate).toLocaleDateString("en-IN")} · {leave.reason}</small></div>
                                <Badge variant={leave.status === "Approved" ? "success" : leave.status === "Rejected" ? "danger" : "warning"}>{leave.status}</Badge>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {activeTab === "payroll" && (
                <section className={styles.panel}>
                    <div className={styles.panelHead}><div><span>Compensation</span><h2>My payslips</h2></div></div>
                    <div className={styles.payslipGrid}>
                        {payroll.map((record) => (
                            <button key={record.id} onClick={() => setSelectedPayslip(record)}>
                                <span><ReceiptText size={20} /></span>
                                <div><strong>{new Date(`${record.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong><small>Net pay {money(record.netSalary)}</small></div>
                                <Badge variant={record.paymentStatus === "Paid" ? "success" : "warning"}>{record.paymentStatus}</Badge>
                                <ArrowRight size={17} />
                            </button>
                        ))}
                        {payroll.length === 0 && <div className={styles.empty}>No payroll records are available.</div>}
                    </div>
                </section>
            )}

            {activeTab === "requests" && (
                <section className={styles.panel}>
                    <div className={styles.panelHead}><div><span>Guest experience</span><h2>Service requests</h2></div><Badge variant="primary">{openRequests.length} open</Badge></div>
                    <div className={styles.requestCards}>
                        {requests.map((request) => (
                            <article key={request.id}>
                                <span className={styles.requestIcon}>{request.requestType.toLowerCase().includes("bed") ? <BedDouble size={20} /> : <Sparkles size={20} />}</span>
                                <div className={styles.requestCopy}>
                                    <strong>{request.requestType}</strong>
                                    <small>Room {request.guest?.roomNumber || "TBA"} · {request.guest?.name || "Guest"}</small>
                                    <span>{new Date(request.createdAt).toLocaleString("en-IN")}</span>
                                </div>
                                <div className={styles.requestActions}>
                                    {request.status === "Pending" && (
                                        <>
                                            <Input type="number" min="0" placeholder="₹ Charge" value={requestCharge[request.id] || ""} onChange={(event) => setRequestCharge({ ...requestCharge, [request.id]: event.target.value })} />
                                            <Button size="sm" onClick={() => approveRequest(request.id, "Approved")} loading={busy === request.id}>Approve</Button>
                                            <Button size="sm" variant="outline" onClick={() => approveRequest(request.id, "Rejected")}>Reject</Button>
                                        </>
                                    )}
                                    {request.status === "Approved" && <Button size="sm" onClick={() => approveRequest(request.id, "InProgress")}>Start</Button>}
                                    {request.status === "InProgress" && <Button size="sm" onClick={() => approveRequest(request.id, "Completed")}>Complete</Button>}
                                    {!["Pending", "Approved", "InProgress"].includes(request.status) && <Badge variant={request.status === "Completed" ? "success" : "danger"}>{request.status}</Badge>}
                                </div>
                            </article>
                        ))}
                        {requests.length === 0 && <div className={styles.empty}>No guest requests are waiting.</div>}
                    </div>
                </section>
            )}

            <Modal
                isOpen={showLeave}
                onClose={() => setShowLeave(false)}
                title="Apply for leave"
                footer={<><Button variant="outline" onClick={() => setShowLeave(false)}>Cancel</Button><Button onClick={applyLeave} loading={busy === "leave"}>Submit request</Button></>}
            >
                <div className={styles.leaveForm}>
                    <label><span>Leave type</span><select className="select-field" value={leaveForm.leaveTypeId} onChange={(event) => setLeaveForm({ ...leaveForm, leaveTypeId: event.target.value })}><option value="">Select leave type</option>{leaveBalances.map((balance) => <option key={balance.id} value={balance.id}>{balance.name} · {balance.available} days available</option>)}</select></label>
                    <div><Input label="From" type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} /><Input label="To" type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} /></div>
                    <label><span>Reason</span><textarea className="textarea-field" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} placeholder="Tell your manager why you need time off" /></label>
                </div>
            </Modal>

            <Modal
                isOpen={Boolean(selectedPayslip)}
                onClose={() => setSelectedPayslip(null)}
                title={`Payslip · ${selectedPayslip ? new Date(`${selectedPayslip.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : ""}`}
                footer={<Button onClick={() => window.print()}><FileText size={16} /> Print payslip</Button>}
            >
                {selectedPayslip && (
                    <div className={styles.payslipDetail}>
                        <div className={styles.payslipHero}><span><HandCoins size={22} /></span><div><small>Net salary</small><strong>{money(selectedPayslip.netSalary)}</strong><p>{selectedPayslip.paymentStatus}</p></div></div>
                        <div className={styles.salaryColumns}>
                            <div><h3>Earnings</h3><p><span>Basic salary</span><strong>{money(selectedPayslip.basicSalary)}</strong></p><p><span>HRA</span><strong>{money(selectedPayslip.hra)}</strong></p><p><span>Conveyance</span><strong>{money(selectedPayslip.conveyance)}</strong></p><p><span>Other allowances</span><strong>{money(selectedPayslip.medicalAllowance + selectedPayslip.otherAllowances)}</strong></p><p className={styles.total}><span>Gross salary</span><strong>{money(selectedPayslip.grossSalary)}</strong></p></div>
                            <div><h3>Deductions</h3><p><span>Provident fund</span><strong>{money(selectedPayslip.pf)}</strong></p><p><span>ESI</span><strong>{money(selectedPayslip.esi)}</strong></p><p><span>Professional tax</span><strong>{money(selectedPayslip.pt)}</strong></p><p><span>TDS & other</span><strong>{money(selectedPayslip.tds + selectedPayslip.otherDeductions)}</strong></p><p className={styles.total}><span>Total deductions</span><strong>{money(selectedPayslip.totalDeductions)}</strong></p></div>
                        </div>
                        <div className={styles.workDays}><span><UserRound size={16} /> {selectedPayslip.workingDays} working days</span><span><Banknote size={16} /> {selectedPayslip.lopDays} LOP days</span></div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
