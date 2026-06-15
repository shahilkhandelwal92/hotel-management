"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    BedDouble,
    Building2,
    CalendarCheck2,
    CircleAlert,
    MapPin,
    Pencil,
    Plus,
    ReceiptText,
    ShieldCheck,
    Trash2,
    UsersRound,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "./dashboard.module.css";

interface Hotel {
    id: string;
    name: string;
    location: string;
    roomCount: number;
    status: string;
    isTaxApplicable: boolean;
    _count?: {
        users: number;
        rooms: number;
        events: number;
        reservations: number;
        posOrders: number;
    };
}

interface HotelFormState {
    name: string;
    location: string;
    roomCount: number;
    status: string;
    isTaxApplicable: boolean;
}

const emptyForm: HotelFormState = {
    name: "",
    location: "",
    roomCount: 0,
    status: "Active",
    isTaxApplicable: true,
};

export default function DashboardPage() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [demoMode, setDemoMode] = useState(true);
    const [editHotel, setEditHotel] = useState<Hotel | null>(null);
    const [deleteHotel, setDeleteHotel] = useState<Hotel | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState<HotelFormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const [modeResponse, hotelsResponse] = await Promise.all([
                fetch("/api/settings/demo-mode"),
                fetch("/api/hotels"),
            ]);
            const [modeData, hotelsData] = await Promise.all([
                modeResponse.json(),
                hotelsResponse.json(),
            ]);
            if (!hotelsResponse.ok) throw new Error(hotelsData.error || "Could not load properties");
            setDemoMode(Boolean(modeData.demoMode));
            setHotels(hotelsData.hotels || []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not load the chain dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totals = useMemo(() => ({
        active: hotels.filter((hotel) => hotel.status === "Active").length,
        rooms: hotels.reduce((sum, hotel) => sum + (hotel._count?.rooms ?? hotel.roomCount ?? 0), 0),
        team: hotels.reduce((sum, hotel) => sum + (hotel._count?.users ?? 0), 0),
        reservations: hotels.reduce((sum, hotel) => sum + (hotel._count?.reservations ?? 0), 0),
    }), [hotels]);

    const closeEditor = () => {
        setShowAdd(false);
        setEditHotel(null);
        setForm(emptyForm);
        setMessage("");
    };

    const saveHotel = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        const url = editHotel ? `/api/hotels/${editHotel.id}` : "/api/hotels";
        try {
            const response = await fetch(url, {
                method: editHotel ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not save this property");

            if (editHotel) {
                setHotels((current) => current.map((hotel) => (
                    hotel.id === editHotel.id ? { ...hotel, ...data.hotel } : hotel
                )));
            } else {
                setHotels((current) => [data.hotel, ...current]);
            }
            closeEditor();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not save this property");
        } finally {
            setSaving(false);
        }
    };

    const removeHotel = async () => {
        if (!deleteHotel) return;
        setSaving(true);
        setMessage("");
        try {
            const response = await fetch(`/api/hotels/${deleteHotel.id}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not delete this property");
            setHotels((current) => current.filter((hotel) => hotel.id !== deleteHotel.id));
            setDeleteHotel(null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not delete this property");
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (hotel: Hotel) => {
        setEditHotel(hotel);
        setForm({
            name: hotel.name,
            location: hotel.location,
            roomCount: hotel.roomCount,
            status: hotel.status,
            isTaxApplicable: hotel.isTaxApplicable,
        });
        setMessage("");
    };

    return (
        <div className="page-shell">
            <section className={styles.hero}>
                <div>
                    <div className="page-eyebrow"><ShieldCheck size={14} /> Chain command center</div>
                    <h1>Every property, one clear view.</h1>
                    <p>Move between hotels, monitor capacity, and keep teams aligned without losing property context.</p>
                </div>
                <div className={styles.heroActions}>
                    <Badge variant={demoMode ? "warning" : "success"}>
                        {demoMode ? "Demo workspace" : "Live workspace"}
                    </Badge>
                    <Button onClick={() => { setShowAdd(true); setMessage(""); }}>
                        <Plus size={17} /> Add property
                    </Button>
                </div>
            </section>

            {message && <div className={styles.notice} role="alert"><CircleAlert size={17} /> {message}</div>}

            <section className={styles.metrics} aria-label="Portfolio summary">
                <article className={styles.metric}>
                    <span className={styles.metricIcon}><Building2 size={20} /></span>
                    <div><span>Active properties</span><strong>{loading ? "--" : totals.active}</strong></div>
                </article>
                <article className={styles.metric}>
                    <span className={`${styles.metricIcon} ${styles.mint}`}><BedDouble size={20} /></span>
                    <div><span>Rooms in portfolio</span><strong>{loading ? "--" : totals.rooms}</strong></div>
                </article>
                <article className={styles.metric}>
                    <span className={`${styles.metricIcon} ${styles.coral}`}><UsersRound size={20} /></span>
                    <div><span>Assigned team</span><strong>{loading ? "--" : totals.team}</strong></div>
                </article>
                <article className={styles.metric}>
                    <span className={`${styles.metricIcon} ${styles.yellow}`}><CalendarCheck2 size={20} /></span>
                    <div><span>Reservations tracked</span><strong>{loading ? "--" : totals.reservations}</strong></div>
                </article>
            </section>

            <section className={styles.portfolio}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2>Property portfolio</h2>
                        <p>Open a hotel to review its rooms, people, events, and operational setup.</p>
                    </div>
                    <span>{hotels.length} total</span>
                </div>

                {loading ? (
                    <div className={styles.loadingGrid}>
                        {[0, 1, 2].map((item) => <div key={item} className={styles.skeleton} />)}
                    </div>
                ) : hotels.length === 0 ? (
                    <div className={styles.empty}>
                        <Building2 size={30} />
                        <h3>No properties yet</h3>
                        <p>Add the first hotel to start configuring rooms, staff, and guest operations.</p>
                        <Button onClick={() => setShowAdd(true)}><Plus size={17} /> Add first property</Button>
                    </div>
                ) : (
                    <div className={styles.propertyGrid}>
                        {hotels.map((hotel) => (
                            <article className={styles.propertyCard} key={hotel.id}>
                                <div className={styles.propertyTop}>
                                    <div className={styles.propertyMark}><Building2 size={22} /></div>
                                    <Badge variant={hotel.status === "Active" ? "success" : "neutral"}>{hotel.status}</Badge>
                                </div>
                                <div className={styles.propertyTitle}>
                                    <h3>{hotel.name}</h3>
                                    <p><MapPin size={14} /> {hotel.location}</p>
                                </div>
                                <div className={styles.propertyStats}>
                                    <div><strong>{hotel._count?.rooms ?? hotel.roomCount}</strong><span>Rooms</span></div>
                                    <div><strong>{hotel._count?.users ?? 0}</strong><span>Team</span></div>
                                    <div><strong>{hotel._count?.events ?? 0}</strong><span>Events</span></div>
                                    <div><strong>{hotel._count?.posOrders ?? 0}</strong><span>Orders</span></div>
                                </div>
                                <div className={styles.taxLine}>
                                    <ReceiptText size={15} />
                                    {hotel.isTaxApplicable ? "GST billing enabled" : "Tax-exempt configuration"}
                                </div>
                                <div className={styles.cardActions}>
                                    <Button size="sm" onClick={() => router.push(`/admin/hotel/${hotel.id}`)}>
                                        Open property <ArrowRight size={15} />
                                    </Button>
                                    <Button variant="outline" size="sm" aria-label={`Edit ${hotel.name}`} onClick={() => openEdit(hotel)}>
                                        <Pencil size={15} />
                                    </Button>
                                    <Button variant="danger" size="sm" aria-label={`Delete ${hotel.name}`} onClick={() => { setDeleteHotel(hotel); setMessage(""); }}>
                                        <Trash2 size={15} />
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <Modal
                isOpen={showAdd || Boolean(editHotel)}
                onClose={closeEditor}
                title={editHotel ? `Edit ${editHotel.name}` : "Add a property"}
                footer={(
                    <>
                        <Button variant="outline" onClick={closeEditor}>Cancel</Button>
                        <Button onClick={() => formRef.current?.requestSubmit()} loading={saving}>
                            {editHotel ? "Save changes" : "Create property"}
                        </Button>
                    </>
                )}
            >
                <form ref={formRef} id="property-form" onSubmit={saveHotel} className={styles.form}>
                    {message && <div className={styles.notice} role="alert"><CircleAlert size={16} /> {message}</div>}
                    <Input label="Property name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. StayOS Jaipur" />
                    <Input label="City and state" required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Jaipur, Rajasthan" />
                    <Input label="Room capacity" type="number" min={0} required value={form.roomCount} onChange={(event) => setForm({ ...form, roomCount: Number(event.target.value) || 0 })} />
                    <label className={styles.selectLabel}>
                        <span>Status</span>
                        <select className="select-field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                        </select>
                    </label>
                    <label className={styles.checkRow}>
                        <input type="checkbox" checked={form.isTaxApplicable} onChange={(event) => setForm({ ...form, isTaxApplicable: event.target.checked })} />
                        <span><strong>Enable GST billing</strong><small>Apply the hotel tax engine to eligible invoices.</small></span>
                    </label>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(deleteHotel)}
                onClose={() => { setDeleteHotel(null); setMessage(""); }}
                title="Delete property"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setDeleteHotel(null)}>Keep property</Button>
                        <Button variant="danger" onClick={removeHotel} loading={saving}>Delete permanently</Button>
                    </>
                )}
            >
                <div className={styles.deleteBody}>
                    <span><CircleAlert size={24} /></span>
                    <div>
                        <h3>This cannot be undone</h3>
                        <p>Deleting <strong>{deleteHotel?.name}</strong> also removes its linked operational data. Export anything required for compliance first.</p>
                    </div>
                </div>
                {message && <div className={styles.notice} role="alert"><CircleAlert size={16} /> {message}</div>}
            </Modal>
        </div>
    );
}
