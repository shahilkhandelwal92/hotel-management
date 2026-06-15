"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight,
    BedDouble,
    BellRing,
    CalendarCheck2,
    Check,
    ChevronRight,
    ConciergeBell,
    CreditCard,
    Hotel,
    KeyRound,
    LoaderCircle,
    LogOut,
    MapPin,
    ReceiptText,
    Sparkles,
    UtensilsCrossed,
    WalletCards,
    Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import styles from "./guest.module.css";

type Stay = {
    id: string;
    guestName: string;
    bookingRef: string;
    status: string;
    checkIn: string;
    checkOut: string;
    room?: { number: string; type: string; floor: number } | null;
    hotel: { name: string; location: string; phone?: string | null; email?: string | null };
    totalBalance: number;
    canSelfCheckIn: boolean;
    canSelfCheckOut: boolean;
    onlinePaymentsEnabled: boolean;
    requests: { id: string; requestType: string; status: string; amount: number; createdAt: string }[];
    orders: {
        id: string;
        status: string;
        grandTotal: number;
        createdAt: string;
        items: { id: string; quantity: number; menuItem: { name: string } }[];
    }[];
    amenities: {
        id: string;
        name: string;
        price: number;
        pricingType: string;
        customSlots?: unknown;
    }[];
    amenityBookings: {
        id: string;
        startTime: string;
        status: string;
        totalAmount: number;
        amenity: { name: string };
    }[];
    folios: {
        id: string;
        transactions: {
            id: string;
            type: string;
            description: string;
            amount: number;
            postedAt: string;
        }[];
    }[];
};

type EventGuest = {
    id: string;
    name: string;
    status: string;
    event?: { hotel?: { name: string; location: string } };
};

const serviceActions = [
    { type: "Extra Bed", label: "Extra bed", icon: BedDouble, color: "violet" },
    { type: "Housekeeping", label: "Room cleaning", icon: Sparkles, color: "mint" },
    { type: "Laundry", label: "Laundry", icon: ConciergeBell, color: "coral" },
    { type: "Maintenance", label: "Maintenance", icon: Wrench, color: "yellow" },
];

function formatMoney(value: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function nextDayInputValue() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function GuestPortalContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const router = useRouter();
    const [stay, setStay] = useState<Stay | null>(null);
    const [eventGuest, setEventGuest] = useState<EventGuest | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyAction, setBusyAction] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [bookingAmenity, setBookingAmenity] = useState<Stay["amenities"][number] | null>(null);
    const [amenityDate, setAmenityDate] = useState("");
    const [amenityTime, setAmenityTime] = useState("");
    const [showPayment, setShowPayment] = useState(false);

    const loadStay = useCallback(async () => {
        const response = await fetch("/api/guest/stay");
        if (!response.ok) return false;
        const data = await response.json();
        setStay(data.stay);
        return true;
    }, []);

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            setError("");
            try {
                if (token) {
                    const verifyResponse = await fetch(`/api/guests/verify/${encodeURIComponent(token)}`);
                    const verifyData = await verifyResponse.json();
                    if (!verifyResponse.ok) throw new Error(verifyData.error || "This stay link is invalid.");
                    if (verifyData.mode === "event") {
                        setEventGuest(verifyData.guest);
                        return;
                    }
                }
                const loaded = await loadStay();
                if (!loaded) throw new Error("Open the secure stay link shared by the hotel.");
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Unable to load your stay.");
            } finally {
                setLoading(false);
            }
        };
        initialize();
    }, [loadStay, token]);

    const stayNights = useMemo(() => {
        if (!stay) return 0;
        return Math.max(1, Math.ceil((new Date(stay.checkOut).getTime() - new Date(stay.checkIn).getTime()) / 86_400_000));
    }, [stay]);

    const runStayAction = async (action: "check_in" | "checkout") => {
        setBusyAction(action);
        setError("");
        const response = await fetch("/api/guest/stay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "The action could not be completed.");
        } else {
            setNotice(action === "check_in" ? "You are checked in. Welcome to your stay." : "Checkout complete. Have a safe journey.");
            await loadStay();
        }
        setBusyAction("");
    };

    const requestService = async (requestType: string) => {
        setBusyAction(requestType);
        setError("");
        const response = await fetch("/api/guest/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestType }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Could not send your request.");
        else {
            setNotice(`${requestType} request sent to the hotel team.`);
            await loadStay();
        }
        setBusyAction("");
    };

    const bookAmenity = async () => {
        if (!bookingAmenity || !amenityDate || !amenityTime) return;
        setBusyAction("amenity");
        const start = new Date(`${amenityDate}T${amenityTime}`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const response = await fetch("/api/guest/amenities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amenityId: bookingAmenity.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
            }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Could not book this amenity.");
        else {
            setNotice(`${bookingAmenity.name} booked successfully.`);
            setBookingAmenity(null);
            setAmenityDate("");
            setAmenityTime("");
            await loadStay();
        }
        setBusyAction("");
    };

    const openAmenityBooking = (amenity: Stay["amenities"][number]) => {
        setBookingAmenity(amenity);
        setAmenityDate(nextDayInputValue());
        setAmenityTime("10:00");
        setError("");
    };

    const pay = async (paymentMode: "UPI" | "Card" | "PayAtDesk") => {
        setBusyAction(paymentMode);
        const response = await fetch("/api/guest/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentMode }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Payment could not be completed.");
        else {
            setNotice(data.message || `${formatMoney(data.amount)} paid successfully. Ref: ${data.reference}`);
            setShowPayment(false);
            await loadStay();
        }
        setBusyAction("");
    };

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
    };

    if (loading) {
        return (
            <div className={styles.centerState}>
                <span className={styles.loadingMark}><LoaderCircle className="animate-spin" size={24} /></span>
                <h2>Preparing your stay</h2>
                <p>Connecting your room, requests, dining, and bill.</p>
            </div>
        );
    }

    if (error && !stay && !eventGuest) {
        return (
            <div className={styles.centerState}>
                <span className={styles.errorMark}><KeyRound size={24} /></span>
                <h2>Stay link unavailable</h2>
                <p>{error}</p>
                <Button variant="outline" onClick={() => router.push("/login")}>Return to sign in</Button>
            </div>
        );
    }

    if (eventGuest) {
        return (
            <main className={styles.eventPage}>
                <div className={styles.eventPass}>
                    <div className={styles.eventBrand}><Hotel size={20} /> {eventGuest.event?.hotel?.name || "Hotel event"}</div>
                    <Badge variant={eventGuest.status === "Attended" ? "success" : "warning"}>{eventGuest.status}</Badge>
                    <h1>{eventGuest.name}</h1>
                    <p>{eventGuest.event?.hotel?.location}</p>
                    <div className={styles.qrPlaceholder}>{eventGuest.id.slice(0, 8).toUpperCase()}</div>
                    <p>Present this secure pass at the event desk.</p>
                </div>
            </main>
        );
    }

    if (!stay) return null;
    const latestOrder = stay.orders[0];

    return (
        <main className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.hotelBrand}>
                    <span><Hotel size={20} /></span>
                    <div>
                        <strong>{stay.hotel.name}</strong>
                        <small><MapPin size={12} /> {stay.hotel.location}</small>
                    </div>
                </div>
                <div className={styles.topActions}>
                    <ThemeToggle />
                    <button onClick={logout} aria-label="Close stay session"><LogOut size={18} /></button>
                </div>
            </header>

            <div className={styles.content}>
                {(error || notice) && (
                    <div className={error ? styles.alertError : styles.alertSuccess}>
                        {error || notice}
                        <button onClick={() => { setError(""); setNotice(""); }}>×</button>
                    </div>
                )}

                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <div className={styles.eyebrow}>Your stay companion</div>
                        <h1>Hi {stay.guestName.split(" ")[0]}, everything is ready.</h1>
                        <p>
                            {stay.status === "Confirmed"
                                ? "Complete check-in, then order food, book amenities, and request services from here."
                                : stay.status === "CheckedOut"
                                    ? "Thank you for staying with us. Your checkout is complete."
                                    : "Order, request, book, pay, and check out without waiting at reception."}
                        </p>
                        <div className={styles.heroActions}>
                            {stay.canSelfCheckIn && (
                                <Button size="lg" onClick={() => runStayAction("check_in")} loading={busyAction === "check_in"}>
                                    Check in now <ArrowRight size={17} />
                                </Button>
                            )}
                            {stay.status === "CheckedIn" && (
                                <Button
                                    size="lg"
                                    variant={stay.canSelfCheckOut ? "primary" : "outline"}
                                    onClick={() => stay.canSelfCheckOut ? runStayAction("checkout") : setShowPayment(true)}
                                    loading={busyAction === "checkout"}
                                >
                                    {stay.canSelfCheckOut ? "Complete checkout" : "Settle bill to checkout"}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className={styles.roomCard}>
                        <div className={styles.roomTop}>
                            <span>Room</span>
                            <Badge variant={stay.status === "CheckedIn" ? "success" : stay.status === "CheckedOut" ? "neutral" : "warning"}>
                                {stay.status}
                            </Badge>
                        </div>
                        <strong>{stay.room?.number || "TBA"}</strong>
                        <p>{stay.room?.type || "Room assignment pending"}{stay.room ? ` · Floor ${stay.room.floor}` : ""}</p>
                        <div className={styles.stayMeta}>
                            <div><small>Check-in</small><span>{new Date(stay.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
                            <div><small>Check-out</small><span>{new Date(stay.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
                            <div><small>Nights</small><span>{stayNights}</span></div>
                        </div>
                    </div>
                </section>

                <section className={styles.quickGrid}>
                    <Link href="/guest/dining" className={`${styles.quickCard} ${styles.quickViolet}`}>
                        <span><UtensilsCrossed size={21} /></span>
                        <div><strong>Order food</strong><small>Live menu and tracking</small></div>
                        <ChevronRight size={18} />
                    </Link>
                    <button className={`${styles.quickCard} ${styles.quickMint}`} onClick={() => document.getElementById("amenities")?.scrollIntoView()}>
                        <span><CalendarCheck2 size={21} /></span>
                        <div><strong>Book amenities</strong><small>Spa, gym, and more</small></div>
                        <ChevronRight size={18} />
                    </button>
                    <button className={`${styles.quickCard} ${styles.quickCoral}`} onClick={() => setShowPayment(true)}>
                        <span><WalletCards size={21} /></span>
                        <div><strong>My bill</strong><small>{formatMoney(stay.totalBalance)} outstanding</small></div>
                        <ChevronRight size={18} />
                    </button>
                </section>

                {latestOrder && (
                    <section className={styles.orderTracker}>
                        <div className={styles.orderIcon}><BellRing size={20} /></div>
                        <div>
                            <small>Latest room-service order</small>
                            <strong>{latestOrder.status}</strong>
                            <p>{latestOrder.items.map((item) => `${item.quantity}× ${item.menuItem.name}`).join(", ")}</p>
                        </div>
                        <Badge variant={["Delivered", "Completed"].includes(latestOrder.status) ? "success" : "primary"}>
                            {formatMoney(latestOrder.grandTotal)}
                        </Badge>
                    </section>
                )}

                <section className={styles.section}>
                    <div className={styles.sectionHeading}>
                        <div><span>Need something?</span><h2>Room services</h2></div>
                        <p>Your request goes directly to the hotel team.</p>
                    </div>
                    <div className={styles.serviceGrid}>
                        {serviceActions.map(({ type, label, icon: Icon, color }) => (
                            <button key={type} className={styles.serviceCard} data-color={color} onClick={() => requestService(type)} disabled={busyAction === type || stay.status !== "CheckedIn"}>
                                <span><Icon size={21} /></span>
                                <strong>{label}</strong>
                                <small>{busyAction === type ? "Sending..." : "Request now"}</small>
                            </button>
                        ))}
                    </div>
                    {stay.requests.length > 0 && (
                        <div className={styles.requestList}>
                            {stay.requests.slice(0, 4).map((request) => (
                                <div key={request.id}>
                                    <span className={styles.requestCheck}><Check size={14} /></span>
                                    <div><strong>{request.requestType}</strong><small>{new Date(request.createdAt).toLocaleString("en-IN")}</small></div>
                                    <Badge variant={request.status === "Approved" ? "success" : request.status === "Rejected" ? "danger" : "warning"}>{request.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.section} id="amenities">
                    <div className={styles.sectionHeading}>
                        <div><span>Make time for you</span><h2>Hotel amenities</h2></div>
                        <p>Book a one-hour slot and charge it to your room.</p>
                    </div>
                    <div className={styles.amenityGrid}>
                        {stay.amenities.map((amenity) => (
                            <article key={amenity.id} className={styles.amenityCard}>
                                <span className={styles.amenityIcon}><Sparkles size={21} /></span>
                                <div>
                                    <strong>{amenity.name}</strong>
                                    <small>{amenity.pricingType === "FREE" ? "Included with your stay" : formatMoney(amenity.price)}</small>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => openAmenityBooking(amenity)} disabled={stay.status !== "CheckedIn"}>Book</Button>
                            </article>
                        ))}
                        {stay.amenities.length === 0 && <div className={styles.empty}>No bookable amenities are configured yet.</div>}
                    </div>
                    {stay.amenityBookings.length > 0 && (
                        <div className={styles.bookings}>
                            {stay.amenityBookings.map((booking) => (
                                <div key={booking.id}>
                                    <CalendarCheck2 size={18} />
                                    <span><strong>{booking.amenity.name}</strong><small>{new Date(booking.startTime).toLocaleString("en-IN")}</small></span>
                                    <Badge variant="success">{booking.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.billBanner}>
                    <span className={styles.billIcon}><ReceiptText size={24} /></span>
                    <div>
                        <small>Current folio balance</small>
                        <strong>{formatMoney(stay.totalBalance)}</strong>
                        <p>Includes room, dining, amenities, and approved service charges.</p>
                    </div>
                    <Button variant={stay.totalBalance > 0 ? "primary" : "outline"} onClick={() => setShowPayment(true)}>
                        {stay.totalBalance > 0 ? "View and pay" : "View folio"}
                    </Button>
                </section>
            </div>

            <Modal
                isOpen={Boolean(bookingAmenity)}
                onClose={() => setBookingAmenity(null)}
                title={`Book ${bookingAmenity?.name || "amenity"}`}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setBookingAmenity(null)}>Cancel</Button>
                        <Button
                            onClick={bookAmenity}
                            loading={busyAction === "amenity"}
                            disabled={!amenityDate || !amenityTime}
                        >
                            Confirm booking
                        </Button>
                    </>
                }
            >
                <div className={styles.modalForm}>
                    <div className={styles.priceNote}>
                        <Sparkles size={18} />
                        <span>{bookingAmenity?.pricingType === "FREE" ? "Included with your stay" : `${formatMoney(bookingAmenity?.price || 0)} will be added to your room folio.`}</span>
                    </div>
                    <label><span>Date</span><input className="field" type="date" value={amenityDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setAmenityDate(event.target.value)} /></label>
                    <label><span>Start time</span><input className="field" type="time" value={amenityTime} onChange={(event) => setAmenityTime(event.target.value)} /></label>
                    <p>Bookings are one hour. The hotel team will confirm any special instructions.</p>
                </div>
            </Modal>

            <Modal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                title="Settle your stay"
            >
                <div className={styles.paymentModal}>
                    <div className={styles.balanceBlock}>
                        <small>Amount due</small>
                        <strong>{formatMoney(stay.totalBalance)}</strong>
                    </div>
                    {stay.folios.flatMap((folio) => folio.transactions).slice(0, 8).map((transaction) => (
                        <div className={styles.transaction} key={transaction.id}>
                            <div><strong>{transaction.description}</strong><small>{new Date(transaction.postedAt).toLocaleDateString("en-IN")}</small></div>
                            <span className={transaction.amount < 0 ? styles.credit : ""}>{transaction.amount < 0 ? "−" : ""}{formatMoney(Math.abs(transaction.amount))}</span>
                        </div>
                    ))}
                    {stay.totalBalance > 0 && (
                        <div className={styles.paymentChoices}>
                            {stay.onlinePaymentsEnabled && (
                                <>
                                    <button onClick={() => pay("UPI")} disabled={Boolean(busyAction)}><span><CreditCard size={19} /></span><div><strong>Pay by UPI</strong><small>Instant secure payment</small></div><ChevronRight size={17} /></button>
                                    <button onClick={() => pay("Card")} disabled={Boolean(busyAction)}><span><WalletCards size={19} /></span><div><strong>Pay by card</strong><small>Credit or debit card</small></div><ChevronRight size={17} /></button>
                                </>
                            )}
                            <button onClick={() => pay("PayAtDesk")} disabled={Boolean(busyAction)}><span><ConciergeBell size={19} /></span><div><strong>Pay at front desk</strong><small>Cash, card, or UPI at reception</small></div><ChevronRight size={17} /></button>
                        </div>
                    )}
                </div>
            </Modal>
        </main>
    );
}

export default function GuestPage() {
    return (
        <Suspense fallback={<div className={styles.centerState}><LoaderCircle className="animate-spin" size={28} /></div>}>
            <GuestPortalContent />
        </Suspense>
    );
}
