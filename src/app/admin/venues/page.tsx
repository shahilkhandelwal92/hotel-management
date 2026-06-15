"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

interface Venue {
    id: string;
    name: string;
    maxCapacity: number;
    basePricePerDay: number;
    decorationPrice: number;
    foodPerPerson: number;
}

interface Booking {
    id: string;
    guestName: string;
    eventType: string;
    venue: { name: string };
    startDate: string;
    endDate: string;
    guestCount: number;
    estimatedCost: number;
    status: string;
}

export default function AdminVenuesPage() {
    const [activeTab, setActiveTab] = useState("Venues");
    const [venues, setVenues] = useState<Venue[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [hotelId, setHotelId] = useState("");
    const [hotels, setHotels] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // Form state for new Venue
    const [newVenue, setNewVenue] = useState({
        name: "",
        maxCapacity: 100,
        basePricePerDay: 10000,
        decorationPrice: 5000,
        foodPerPerson: 500
    });

    useEffect(() => {
        fetch("/api/hotels").then(r => r.json()).then(d => {
            if (d.hotels?.length) {
                setHotels(d.hotels);
                setHotelId(d.hotels[0].id);
            }
        });
    }, []);

    const fetchData = async () => {
        if (!hotelId) return;
        setLoading(true);
        try {
            const type = activeTab === "Venues" ? "venues" : "bookings";
            const res = await fetch(`/api/venues?hotelId=${hotelId}&type=${type}`);
            const data = await res.json();
            if (activeTab === "Venues") setVenues(data.venues || []);
            else setBookings(data.bookings || []);
        } catch (err) {
            console.error("Fetch venues/bookings error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [hotelId, activeTab]);

    const handleAddVenue = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/venues", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newVenue, hotelId, type: "venue" })
            });
            if (res.ok) {
                setNewVenue({ name: "", maxCapacity: 100, basePricePerDay: 10000, decorationPrice: 5000, foodPerPerson: 500 });
                fetchData();
            }
        } catch (err) {
            console.error("Add venue error:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch("/api/venues", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "Confirmed" })
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error("Approve booking error:", err);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Venues & Party Bookings</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Manage banquet halls, lawns, and incoming event reservations.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    {hotels.length > 1 && (
                        <select
                            value={hotelId}
                            onChange={e => setHotelId(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.8rem', borderRadius: '8px' }}
                        >
                            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                {["Venues", "Booking Requests"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: activeTab === tab ? 'var(--accent-gold)' : 'transparent',
                            color: activeTab === tab ? '#000' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Venues" ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
                    <Card title="Managed Spaces" subtitle="Venues available at this property">
                        <Table
                            headers={["Venue Name", "Capacity", "Base Rent", "Fixed Decor", "Food/Head", "Actions"]}
                            loading={loading}
                        >
                            {venues.map(v => (
                                <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{v.name}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>{v.maxCapacity} Pax</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>₹{v.basePricePerDay.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>₹{v.decorationPrice.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>₹{v.foodPerPerson.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <Button size="sm" variant="outline">Edit</Button>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </Card>

                    <Card title="New Venue" subtitle="Add a banquet hall or lawn">
                        <form onSubmit={handleAddVenue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Input label="Name" value={newVenue.name} onChange={e => setNewVenue({ ...newVenue, name: e.target.value })} placeholder="e.g. Imperial Ballroom" />
                            <Input label="Max Capacity" type="number" value={newVenue.maxCapacity.toString()} onChange={e => setNewVenue({ ...newVenue, maxCapacity: parseInt(e.target.value) })} />
                            <Input label="Base Rental (₹)" type="number" value={newVenue.basePricePerDay.toString()} onChange={e => setNewVenue({ ...newVenue, basePricePerDay: parseFloat(e.target.value) })} />
                            <Input label="Decor Cost (₹)" type="number" value={newVenue.decorationPrice.toString()} onChange={e => setNewVenue({ ...newVenue, decorationPrice: parseFloat(e.target.value) })} />
                            <Input label="Food Cost / Pax (₹)" type="number" value={newVenue.foodPerPerson.toString()} onChange={e => setNewVenue({ ...newVenue, foodPerPerson: parseFloat(e.target.value) })} />
                            <Button variant="primary" type="submit" loading={saving} style={{ width: '100%' }}>Add Venue</Button>
                        </form>
                    </Card>
                </div>
            ) : (
                <Card title="Event Reservations" subtitle="Customer requests for party venue bookings">
                    <Table
                        headers={["Client Name", "Event Details", "Venue & Dates", "Est. Value", "Status", "Actions"]}
                        loading={loading}
                    >
                        {bookings.map(b => (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{b.guestName}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div>{b.eventType}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.guestCount} Guests</div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div>{b.venue.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(b.startDate).toLocaleDateString("en-IN")}</div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>₹{b.estimatedCost.toLocaleString()}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <Badge variant={b.status === "Confirmed" ? "success" : "warning"}>{b.status}</Badge>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    {b.status === "Pending" ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button size="sm" variant="secondary" onClick={() => handleApprove(b.id)}>Approve</Button>
                                            <Button size="sm" variant="outline">Reject</Button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Settled</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            )}
        </div>
    );
}
