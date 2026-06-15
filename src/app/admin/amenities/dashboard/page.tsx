"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface Amenity {
    id: string;
    name: string;
    price: number;
    pricingType: string;
    customSlots?: any;
    isTaxApplicable: boolean;
}

interface Booking {
    id: string;
    amenityId: string;
    guestName: string;
    guestContact: string;
    roomNumber: string | null;
    startTime: string;
    endTime: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    invoiceToken: string | null;
    amenity: Amenity;
}

export default function AmenityBookingsDashboard() {
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedAmenityFilter, setSelectedAmenityFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Booking Modal
    const [showBook, setShowBook] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bookingForm, setBookingForm] = useState({
        amenityId: '',
        guestName: '',
        guestContact: '',
        roomNumber: '',
        startTime: '',
        endTime: '',
    });
    const [bookingError, setBookingError] = useState('');

    // Invoice / Receipt download state
    const [downloadingStr, setDownloadingStr] = useState<string | null>(null);

    const fetchAmenities = async () => {
        try {
            const res = await fetch("/api/amenities");
            const data = await res.json();
            setAmenities(data.amenities || []);
        } catch (err) {
            console.error("Failed to fetch amenities", err);
        }
    };

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/amenities/bookings?date=${selectedDate}`;
            if (selectedAmenityFilter) url += `&amenityId=${selectedAmenityFilter}`;

            const res = await fetch(url);
            const data = await res.json();
            setBookings(data.bookings || []);
        } catch (err) {
            console.error("Failed to fetch bookings", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedAmenityFilter]);

    useEffect(() => {
        fetchAmenities();
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setBookingError('');

        const selectedAmenity = amenities.find(a => a.id === bookingForm.amenityId);
        if (!selectedAmenity) {
            setBookingError("Please select a valid amenity.");
            setSaving(false);
            return;
        }

        if (!bookingForm.startTime || !bookingForm.endTime) {
            setBookingError("Please select a specific slot.");
            setSaving(false);
            return;
        }

        // Send UTC time variants directly mapped instead of computing manually
        const startDt = new Date(`${selectedDate}T${bookingForm.startTime}:00`);
        const endDt = new Date(`${selectedDate}T${bookingForm.endTime}:00`);

        const res = await fetch("/api/amenities/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...bookingForm,
                roomNumber: bookingForm.roomNumber || null,
                startTime: startDt.toISOString(),
                endTime: endDt.toISOString()
            })
        });

        const data = await res.json();

        if (res.ok) {
            setShowBook(false);
            setBookingForm({ amenityId: '', guestName: '', guestContact: '', roomNumber: '', startTime: '', endTime: '' });
            fetchBookings();
        } else {
            setBookingError(data.error || "Failed to create booking - Slot may be occupied.");
        }
        setSaving(false);
    };

    const downloadPdf = async (bookingId: string) => {
        setDownloadingStr(bookingId);
        try {
            const res = await fetch('/api/billing/amenity-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId })
            });
            const data = await res.json();

            if (res.ok && data.pdf) {
                // Decode base64
                const linkSource = `data:application/pdf;base64,${data.pdf}`;
                const downloadLink = document.createElement("a");
                const fileName = `amenity_invoice_${bookingId.substring(0, 6)}.pdf`;
                downloadLink.href = linkSource;
                downloadLink.download = fileName;
                downloadLink.click();
            } else {
                alert("Failed to generate PDF");
            }
        } catch (err) {
            console.error("PDF Generate error:", err);
            alert("An error occurred");
        } finally {
            setDownloadingStr(null);
        }
    };

    const cancelBooking = async (id: string) => {
        if (!confirm("Cancel this booking?")) return;
        const res = await fetch(`/api/amenities/bookings/${id}`, { method: 'DELETE' });
        if (res.ok) fetchBookings();
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Amenities Bookings</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Manage walk-in and room guest reservations for hotel services.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                    />
                    <select
                        value={selectedAmenityFilter}
                        onChange={e => setSelectedAmenityFilter(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                    >
                        <option value="">All Services</option>
                        {amenities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Button variant="primary" onClick={() => setShowBook(true)}>+ New Booking</Button>
                </div>
            </div>

            <Card>
                <Table
                    headers={["Time Slot", "Service", "Guest", "Status", "Amount", "Actions"]}
                    loading={loading}
                >
                    {bookings.length === 0 && !loading && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No entries found for this date.</td></tr>
                    )}
                    {bookings.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                                {formatTime(b.startTime)} - {formatTime(b.endTime)}
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>{b.amenity?.name || 'Unknown'}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ fontWeight: 500 }}>{b.guestName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.roomNumber ? `Room: ${b.roomNumber}` : 'Walk-in Customer'}</div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <Badge variant={b.paymentStatus === 'PAID' ? 'success' : 'warning'}>{b.paymentStatus}</Badge>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>₹{b.totalAmount.toFixed(2)}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Button size="sm" variant="secondary" onClick={() => downloadPdf(b.id)} loading={downloadingStr === b.id}>
                                        Invoice PDF
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => cancelBooking(b.id)}>Delete</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal
                isOpen={showBook}
                onClose={() => setShowBook(false)}
                title="Reserve A Service Slot"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowBook(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreateBooking} loading={saving}>Confirm Booking</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {bookingError && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>{bookingError}</div>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Service</label>
                        <select
                            value={bookingForm.amenityId}
                            onChange={e => setBookingForm({ ...bookingForm, amenityId: e.target.value, startTime: '', endTime: '' })}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                            required
                        >
                            <option value="">-- Choose --</option>
                            {amenities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.pricingType === "FREE" ? 'Free' : `₹${a.price}`})</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input label="Guest Name" value={bookingForm.guestName} onChange={e => setBookingForm({ ...bookingForm, guestName: e.target.value })} placeholder="John Doe" required />
                        <Input label="Contact (Optional)" value={bookingForm.guestContact} onChange={e => setBookingForm({ ...bookingForm, guestContact: e.target.value })} placeholder="+91..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input label="Room No. (If in-house guest)" value={bookingForm.roomNumber} onChange={e => setBookingForm({ ...bookingForm, roomNumber: e.target.value })} placeholder="Leave blank if Walk-in" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Time Slot (Date: {selectedDate})</label>
                            <select
                                value={`${bookingForm.startTime}-${bookingForm.endTime}`}
                                onChange={e => {
                                    if (!e.target.value || e.target.value === "-") return setBookingForm({ ...bookingForm, startTime: '', endTime: '' });
                                    const [st, et] = e.target.value.split('-');
                                    setBookingForm({ ...bookingForm, startTime: st, endTime: et });
                                }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                                required
                                disabled={!bookingForm.amenityId}
                            >
                                <option value="-">-- Select Slot --</option>
                                {bookingForm.amenityId && (() => {
                                    const a = amenities.find(am => am.id === bookingForm.amenityId);
                                    if (!a) return null;
                                    let slots: any[] = [];
                                    try { slots = typeof a.customSlots === 'string' ? JSON.parse(a.customSlots) : (a.customSlots || []); } catch { }

                                    if (slots.length === 0) return <option disabled>No valid slots mapped</option>;

                                    return slots.map((s, idx) => (
                                        <option key={idx} value={`${s.startTime}-${s.endTime}`}>
                                            {s.name} ({s.startTime} - {s.endTime})
                                        </option>
                                    ));
                                })()}
                            </select>
                        </div>
                    </div>

                    <small style={{ color: 'var(--text-secondary)' }}>Note: Only defined custom slots for the respective service are selectable here. Exact timestamps will be evaluated on submission.</small>
                </div>
            </Modal>
        </div>
    );
}
