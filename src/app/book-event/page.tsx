"use client";

import { useState, useMemo } from "react";
import styles from "./bookEvent.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const VENUES = [
    { id: "1", name: "Grand Ballroom", capacity: 500, basePrice: 50000, decorPrice: 15000, foodPerHead: 1200 },
    { id: "2", name: "Poolside Lawn", capacity: 150, basePrice: 20000, decorPrice: 5000, foodPerHead: 800 },
];

export default function BookEventPage() {
    const [venueId, setVenueId] = useState(VENUES[0].id);
    const [guestCount, setGuestCount] = useState<number>(100);
    const [days, setDays] = useState<number>(1);

    // Toggles
    const [needsDecor, setNeedsDecor] = useState(true);
    const [needsFood, setNeedsFood] = useState(true);
    const [needsRooms, setNeedsRooms] = useState(false);
    const [roomCount, setRoomCount] = useState<number>(10);

    const selectedVenue = VENUES.find(v => v.id === venueId)!;

    // Dynamic Price Calculator
    const { rentTotal, decorTotal, foodTotal, roomsTotal, grandTotal } = useMemo(() => {
        const rentTotal = selectedVenue.basePrice * days;
        const decorTotal = needsDecor ? (selectedVenue.decorPrice * days) : 0;
        const foodTotal = needsFood ? (selectedVenue.foodPerHead * guestCount * days) : 0;
        const roomsTotal = needsRooms ? (roomCount * 4500 * days) : 0; // Assuming 4500 avg room rate

        return {
            rentTotal,
            decorTotal,
            foodTotal,
            roomsTotal,
            grandTotal: rentTotal + decorTotal + foodTotal + roomsTotal
        };
    }, [venueId, guestCount, days, needsDecor, needsFood, needsRooms, roomCount]);

    const handleBooking = () => {
        alert("Booking request submitted! The hotel will contact you shortly to confirm.");
    };

    return (
        <div className={`animate-fade-in ${styles.container}`}>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
                <ThemeToggle />
            </div>

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1>Plan Your Perfect Event</h1>
                    <p>Get a real-time estimate for weddings, corporate retreats, and private parties.</p>
                </div>

                <div className={styles.grid}>
                    {/* Left Column - Form */}
                    <div className={styles.formCard}>
                        <h2 className={styles.sectionTitle}>1. Venue & capacity</h2>

                        <div className={styles.formGroup}>
                            <label>Select Venue Space</label>
                            <select
                                className={styles.inputField}
                                value={venueId}
                                onChange={(e) => setVenueId(e.target.value)}
                            >
                                {VENUES.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} (Max {v.capacity} Pax)</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Expected Guest Count</label>
                                <input
                                    type="number"
                                    className={styles.inputField}
                                    value={guestCount}
                                    onChange={(e) => setGuestCount(Number(e.target.value))}
                                    min={10}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Duration (Days)</label>
                                <input
                                    type="number"
                                    className={styles.inputField}
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value))}
                                    min={1}
                                />
                            </div>
                        </div>

                        <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>2. Services & Add-ons</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.toggleCheckbox}
                                    checked={needsDecor}
                                    onChange={(e) => setNeedsDecor(e.target.checked)}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Standard Decoration Package</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Floral arrangements, stage setup, and lighting.</div>
                                </div>
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.toggleCheckbox}
                                    checked={needsFood}
                                    onChange={(e) => setNeedsFood(e.target.checked)}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Full Catering (Breakfast/Lunch/Dinner)</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Premium buffet setup. ₹{selectedVenue.foodPerHead} per person/day.</div>
                                </div>
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.toggleCheckbox}
                                    checked={needsRooms}
                                    onChange={(e) => setNeedsRooms(e.target.checked)}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Hotel Room Block For Guests</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reserve rooms tightly integrated with the venue.</div>
                                </div>
                            </label>
                        </div>

                        {needsRooms && (
                            <div className={styles.formGroup} style={{ marginLeft: '2.5rem', animation: 'fadeIn 0.3s ease' }}>
                                <label>Number of Rooms</label>
                                <input
                                    type="number"
                                    className={styles.inputField}
                                    value={roomCount}
                                    onChange={(e) => setRoomCount(Number(e.target.value))}
                                    min={1}
                                    style={{ width: '150px' }}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1rem' }}>@ ~₹4,500/night</span>
                            </div>
                        )}

                        <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>3. Contact Details</h2>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Your Name</label>
                                <input type="text" className={styles.inputField} placeholder="John Doe" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Mobile Number</label>
                                <input type="tel" className={styles.inputField} placeholder="+91 xxxxx xxxxx" />
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Cost Estimator */}
                    <div>
                        <div className={styles.receiptCard}>
                            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>Cost Estimate</h2>

                            <div className={styles.receiptItem}>
                                <span>Venue Rental ({days} days)</span>
                                <span>₹{rentTotal.toLocaleString()}</span>
                            </div>

                            {needsDecor && (
                                <div className={styles.receiptItem}>
                                    <span>Decoration Setup</span>
                                    <span>₹{decorTotal.toLocaleString()}</span>
                                </div>
                            )}

                            {needsFood && (
                                <div className={styles.receiptItem}>
                                    <span>Catering ({guestCount} pax)</span>
                                    <span>₹{foodTotal.toLocaleString()}</span>
                                </div>
                            )}

                            {needsRooms && (
                                <div className={styles.receiptItem}>
                                    <span>Room Block ({roomCount} rooms)</span>
                                    <span>₹{roomsTotal.toLocaleString()}</span>
                                </div>
                            )}

                            <div className={styles.divider}></div>

                            <div className={styles.totalRow}>
                                <span>Total Estimate</span>
                                <span>₹{grandTotal.toLocaleString()}</span>
                            </div>

                            <button onClick={handleBooking} className={styles.primaryBtn}>
                                Submit Booking Request
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                This is an estimate. Final pricing may vary based on exact menu choices and date availability.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
