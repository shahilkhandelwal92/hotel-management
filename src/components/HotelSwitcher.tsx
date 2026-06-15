"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import styles from "./HotelSwitcher.module.css";

interface Hotel {
    id: string;
    name: string;
    location: string;
}

interface HotelSwitcherProps {
    collapsed?: boolean;
}

export function HotelSwitcher({ collapsed }: HotelSwitcherProps) {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadHotels = async () => {
            try {
                const [meResponse, hotelsResponse] = await Promise.all([
                    fetch("/api/auth/me"),
                    fetch("/api/auth/hotels"),
                ]);
                const [meData, hotelsData] = await Promise.all([
                    meResponse.json(),
                    hotelsResponse.json(),
                ]);
                if (meResponse.ok) setActiveHotelId(meData.user?.hotelId || null);
                if (hotelsResponse.ok) setHotels(hotelsData.hotels || []);
            } finally {
                setLoading(false);
            }
        };
        void loadHotels();
    }, []);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    const handleSwitch = async (hotelId: string) => {
        if (hotelId === activeHotelId) {
            setIsOpen(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch("/api/auth/switch-hotel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hotelId }),
            });
            if (response.ok) window.location.reload();
        } finally {
            setLoading(false);
        }
    };

    if (loading && hotels.length === 0) return null;
    if (hotels.length <= 1) return null;

    const activeHotel = hotels.find((hotel) => hotel.id === activeHotelId);

    return (
        <div ref={rootRef} className={`${styles.root} ${collapsed ? styles.collapsed : ""}`}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => !collapsed && setIsOpen((value) => !value)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={collapsed ? "Active property" : "Switch active property"}
                title={collapsed ? activeHotel?.name || "Property" : undefined}
            >
                <span className={styles.icon}><Building2 size={17} /></span>
                {!collapsed && (
                    <>
                        <span className={styles.copy}>
                            <small>Active property</small>
                            <strong>{activeHotel?.name || "Choose a property"}</strong>
                        </span>
                        {loading ? <LoaderCircle className={styles.spin} size={16} /> : <ChevronsUpDown size={16} />}
                    </>
                )}
            </button>

            {isOpen && !collapsed && (
                <div className={styles.menu} role="listbox" aria-label="Available properties">
                    {hotels.map((hotel) => {
                        const selected = hotel.id === activeHotelId;
                        return (
                            <button
                                key={hotel.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={styles.option}
                                onClick={() => void handleSwitch(hotel.id)}
                            >
                                <span>
                                    <strong>{hotel.name}</strong>
                                    <small>{hotel.location}</small>
                                </span>
                                {selected && <Check size={16} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
