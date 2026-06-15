"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import styles from "./inventory.module.css";

interface Room {
    id: string;
    number: string;
    type: string;
    price: number;
    includesBreakfast: boolean;
    includesDinner: boolean;
}

interface Amenity {
    id: string;
    name: string;
    price: number;
    pricingType: string;
    customSlots: any;
    isTaxApplicable: boolean;
}

interface MenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
    isVeg: boolean;
    spiceLevel: string;
}

export default function AdminInventoryPage() {
    const [activeTab, setActiveTab] = useState("Rooms");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modals
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [editRoom, setEditRoom] = useState<Room | null>(null);
    const [deleteId, setDeleteId] = useState<{ id: string, type: 'rooms' | 'amenities' | 'menu' } | null>(null);

    const [showAddAmenity, setShowAddAmenity] = useState(false);
    const [editAmenity, setEditAmenity] = useState<Amenity | null>(null);

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editMenu, setEditMenu] = useState<MenuItem | null>(null);

    // Form states
    const [roomForm, setRoomForm] = useState({ number: "", type: "Deluxe Room", price: "", includesBreakfast: false, includesDinner: false });
    const [amenityForm, setAmenityForm] = useState<{
        name: string, price: string, pricingType: string, isTaxApplicable: boolean,
        customSlots: { id?: string, name: string, startTime: string, endTime: string }[]
    }>({
        name: "", price: "", pricingType: "CHARGEABLE",
        customSlots: [{ name: "Full Day", startTime: "00:00", endTime: "23:59" }],
        isTaxApplicable: true
    });
    const [menuForm, setMenuForm] = useState({ name: "", category: "Main Course", price: "", isVeg: true, spiceLevel: "Medium" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === "Rooms") {
                const res = await fetch("/api/rooms");
                const data = await res.json();
                setRooms(data.rooms || []);
            } else if (activeTab === "Amenities") {
                const res = await fetch("/api/amenities");
                const data = await res.json();
                setAmenities(data.amenities || []);
            } else if (activeTab === "Restaurant Menu") {
                const res = await fetch("/api/menu");
                const data = await res.json();
                setMenu(data.menuItems || []);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRoomAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editRoom ? `/api/rooms/${editRoom.id}` : "/api/rooms";
        const method = editRoom ? "PUT" : "POST";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roomForm)
        });
        if (res.ok) {
            setShowAddRoom(false);
            setEditRoom(null);
            setRoomForm({ number: "", type: "Deluxe Room", price: "", includesBreakfast: false, includesDinner: false });
            fetchData();
        }
        setSaving(false);
    };

    const handleAmenityAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editAmenity ? `/api/amenities/${editAmenity.id}` : "/api/amenities";
        const method = editAmenity ? "PUT" : "POST";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(amenityForm)
        });
        if (res.ok) {
            setShowAddAmenity(false);
            setEditAmenity(null);
            setAmenityForm({
                name: "", price: "", pricingType: "CHARGEABLE",
                customSlots: [{ name: "Full Day", startTime: "00:00", endTime: "23:59" }],
                isTaxApplicable: true
            });
            fetchData();
        }
        setSaving(false);
    };

    const handleMenuAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editMenu ? `/api/menu/${editMenu.id}` : "/api/menu";
        const method = editMenu ? "PUT" : "POST";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(menuForm)
        });
        if (res.ok) {
            setShowAddMenu(false);
            setEditMenu(null);
            setMenuForm({ name: "", category: "Main Course", price: "", isVeg: true, spiceLevel: "Medium" });
            fetchData();
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        const res = await fetch(`/api/${deleteId.type}/${deleteId.id}`, { method: "DELETE" });
        if (res.ok) {
            setDeleteId(null);
            fetchData();
        }
        setSaving(false);
    };

    const openEditRoom = (r: Room) => {
        setEditRoom(r);
        setRoomForm({ number: r.number, type: r.type, price: String(r.price), includesBreakfast: r.includesBreakfast, includesDinner: r.includesDinner });
        setShowAddRoom(true);
    };

    const openEditAmenity = (a: any) => {
        setEditAmenity(a);

        let parsedSlots = [];
        try {
            parsedSlots = typeof a.customSlots === 'string' ? JSON.parse(a.customSlots) : a.customSlots;
        } catch { parsedSlots = []; }

        setAmenityForm({
            name: a.name,
            price: String(a.price),
            pricingType: a.pricingType || "CHARGEABLE",
            customSlots: parsedSlots || [],
            isTaxApplicable: a.isTaxApplicable ?? true
        });
        setShowAddAmenity(true);
    };

    const openEditMenu = (m: MenuItem) => {
        setEditMenu(m);
        setMenuForm({ name: m.name, category: m.category, price: String(m.price), isVeg: m.isVeg, spiceLevel: m.spiceLevel });
        setShowAddMenu(true);
    };

    const handleAddSlot = () => {
        setAmenityForm(prev => ({
            ...prev,
            customSlots: [...prev.customSlots, { name: "", startTime: "09:00", endTime: "10:00" }]
        }));
    };

    const handleRemoveSlot = (index: number) => {
        setAmenityForm(prev => ({
            ...prev,
            customSlots: prev.customSlots.filter((_, i) => i !== index)
        }));
    };

    const handleSlotChange = (index: number, field: string, value: string) => {
        setAmenityForm(prev => {
            const updated = [...prev.customSlots];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, customSlots: updated };
        });
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Inventory & Assets</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Manage rooms, dynamic services pricing, and restaurant offerings.
                    </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.4rem', border: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                    {["Rooms", "Amenities", "Restaurant Menu"].map(tab => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab(tab)}
                            style={{ borderRadius: '8px' }}
                        >
                            {tab}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Rooms View */}
            {activeTab === "Rooms" && (
                <Card title="Room Inventory" subtitle="Manage property rooms and inclusions" headerAction={
                    <Button variant="primary" size="sm" onClick={() => { setEditRoom(null); setRoomForm({ number: "", type: "Deluxe Room", price: "", includesBreakfast: false, includesDinner: false }); setShowAddRoom(true); }}>+ Add Room</Button>
                }>
                    <Table
                        headers={["Room No.", "Type", "Base Price", "Inclusions", "Actions"]}
                        loading={loading}
                    >
                        {rooms.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{r.number}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>{r.type}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>₹{r.price}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {r.includesBreakfast && <Badge variant="warning">🍳 Breakfast</Badge>}
                                        {r.includesDinner && <Badge variant="info">🍲 Dinner</Badge>}
                                        {!r.includesBreakfast && !r.includesDinner && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Room Only</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button size="sm" variant="secondary" onClick={() => openEditRoom(r)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setDeleteId({ id: r.id, type: 'rooms' })}>Delete</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            )}

            {/* Menu View */}
            {activeTab === "Restaurant Menu" && (
                <Card title="Dining Menu" subtitle="Configure restaurant items and pricing" headerAction={
                    <Button variant="primary" size="sm" onClick={() => { setEditMenu(null); setMenuForm({ name: "", category: "Main Course", price: "", isVeg: true, spiceLevel: "Medium" }); setShowAddMenu(true); }}>+ Add Dish</Button>
                }>
                    <Table
                        headers={["Item Name", "Category", "Price", "Spice Level", "Actions"]}
                        loading={loading}
                    >
                        {menu.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: m.isVeg ? '#10b981' : '#ef4444', marginRight: '8px' }}></span>
                                    {m.name}
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>{m.category}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>₹{m.price}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <Badge variant="neutral">{m.spiceLevel} Spice</Badge>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button size="sm" variant="secondary" onClick={() => openEditMenu(m)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setDeleteId({ id: m.id, type: 'menu' })}>Delete</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            )}

            {/* Amenities View */}
            {activeTab === "Amenities" && (
                <Card title="Services & Amenities" subtitle="Manage add-on services pricing" headerAction={
                    <Button variant="primary" size="sm" onClick={() => { setEditAmenity(null); setAmenityForm({ name: "", price: "", pricingType: "CHARGEABLE", customSlots: [{ name: "Full Day", startTime: "00:00", endTime: "23:59" }], isTaxApplicable: true }); setShowAddAmenity(true); }}>+ Define Amenity</Button>
                }>
                    <Table
                        headers={["Amenity Name", "Pricing", "Slot Config", "Actions"]}
                        loading={loading}
                    >
                        {amenities.map((a: Amenity) => (
                            <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{a.name}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <span>{a.pricingType === 'FREE' ? 'Free' : `₹${a.price}`}</span>
                                        {a.isTaxApplicable && a.pricingType !== 'FREE' && <Badge variant="neutral">+ GST</Badge>}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {(() => {
                                            try {
                                                const slots = typeof a.customSlots === 'string' ? JSON.parse(a.customSlots as any) : (a.customSlots || []);
                                                if (slots.length === 0) return <span>No slots defined</span>;
                                                return <span>{slots.length} Custom Slot(s)</span>;
                                            } catch { return <span>Invalid Config</span>; }
                                        })()}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button size="sm" variant="secondary" onClick={() => openEditAmenity(a)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setDeleteId({ id: a.id, type: 'amenities' })}>Delete</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            )}

            {/* Room Modal */}
            <Modal
                isOpen={showAddRoom}
                onClose={() => setShowAddRoom(false)}
                title={editRoom ? "Edit Room Details" : "Add New Room"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowAddRoom(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleRoomAction} loading={saving}>{editRoom ? "Save Changes" : "Create Room"}</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input label="Room Number" value={roomForm.number} onChange={e => setRoomForm({ ...roomForm, number: e.target.value })} placeholder="e.g. 201" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Room Type</label>
                        <select
                            value={roomForm.type}
                            onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                        >
                            <option>Deluxe Room</option>
                            <option>Executive Suite</option>
                            <option>Presidential Suite</option>
                            <option>Standard Room</option>
                        </select>
                    </div>
                    <Input label="Base Price (₹)" type="number" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })} placeholder="5000" />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={roomForm.includesBreakfast} onChange={e => setRoomForm({ ...roomForm, includesBreakfast: e.target.checked })} />
                            <span>Complimentary Breakfast</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={roomForm.includesDinner} onChange={e => setRoomForm({ ...roomForm, includesDinner: e.target.checked })} />
                            <span>Complimentary Dinner</span>
                        </label>
                    </div>
                </div>
            </Modal>

            {/* Amenity Modal */}
            <Modal
                isOpen={showAddAmenity}
                onClose={() => setShowAddAmenity(false)}
                title={editAmenity ? "Edit Service Detail" : "Define New Service"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowAddAmenity(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAmenityAction} loading={saving}>{editAmenity ? "Save Changes" : "Define Service"}</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input label="Service Name" value={amenityForm.name} onChange={e => setAmenityForm({ ...amenityForm, name: e.target.value })} placeholder="e.g. Spa Session (60m)" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pricing Type</label>
                            <select
                                value={amenityForm.pricingType}
                                onChange={e => setAmenityForm({ ...amenityForm, pricingType: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                            >
                                <option value="CHARGEABLE">Chargeable</option>
                                <option value="FREE">Free</option>
                            </select>
                        </div>
                        {amenityForm.pricingType === 'CHARGEABLE' && (
                            <Input label="Price (₹)" type="number" value={amenityForm.price} onChange={e => setAmenityForm({ ...amenityForm, price: e.target.value })} placeholder="1500" />
                        )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Custom Time Slots</label>
                            <Button size="sm" variant="secondary" type="button" onClick={handleAddSlot}>+ Add Slot</Button>
                        </div>

                        {amenityForm.customSlots.length === 0 && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No slots configured. Guests won't be able to book this.</p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {amenityForm.customSlots.map((slot, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                                    <Input
                                        label={index === 0 ? "Slot Name" : ""}
                                        value={slot.name}
                                        onChange={e => handleSlotChange(index, 'name', e.target.value)}
                                        placeholder="e.g. Morning"
                                        required
                                    />
                                    <Input
                                        label={index === 0 ? "Start" : ""}
                                        type="time"
                                        value={slot.startTime}
                                        onChange={e => handleSlotChange(index, 'startTime', e.target.value)}
                                        required
                                    />
                                    <Input
                                        label={index === 0 ? "End" : ""}
                                        type="time"
                                        value={slot.endTime}
                                        onChange={e => handleSlotChange(index, 'endTime', e.target.value)}
                                        required
                                    />
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        type="button"
                                        onClick={() => handleRemoveSlot(index)}
                                        style={{ height: '42px' }}
                                    >
                                        ✗
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {amenityForm.pricingType === 'CHARGEABLE' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <input type="checkbox" checked={amenityForm.isTaxApplicable} onChange={e => setAmenityForm({ ...amenityForm, isTaxApplicable: e.target.checked })} />
                            <span>Tax Applicable (GST)</span>
                        </label>
                    )}
                </div>
            </Modal>

            {/* Menu Modal */}
            <Modal
                isOpen={showAddMenu}
                onClose={() => setShowAddMenu(false)}
                title={editMenu ? "Edit Dish Details" : "Add New Dish"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowAddMenu(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleMenuAction} loading={saving}>{editMenu ? "Save Changes" : "Add to Menu"}</Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input label="Dish Name" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Paneer Tikka" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                        <select
                            value={menuForm.category}
                            onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                        >
                            <option>Starters</option>
                            <option>Main Course</option>
                            <option>Breads</option>
                            <option>Desserts</option>
                            <option>Beverages</option>
                        </select>
                    </div>
                    <Input label="Price (₹)" type="number" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="350" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Dietary</label>
                            <select
                                value={String(menuForm.isVeg)}
                                onChange={e => setMenuForm({ ...menuForm, isVeg: e.target.value === "true" })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                            >
                                <option value="true">Veg 🟢</option>
                                <option value="false">Non-Veg 🔴</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Spice Level</label>
                            <select
                                value={menuForm.spiceLevel}
                                onChange={e => setMenuForm({ ...menuForm, spiceLevel: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Confirm Removal"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} loading={saving}>Confirm Delete</Button>
                    </>
                }
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to remove this item? This action cannot be undone and may affect active bookings/orders.</p>
                </div>
            </Modal>
        </div>
    );
}
