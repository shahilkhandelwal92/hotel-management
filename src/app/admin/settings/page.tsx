"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function SettingsPage() {
    const [hotel, setHotel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [form, setForm] = useState({
        hasInHouseRestaurant: true,
        zomatoLink: "",
        swiggyLink: ""
    });

    useEffect(() => {
        const fetchHotel = async () => {
            try {
                // Get current user's hotel
                const res = await fetch("/api/hotels");
                const data = await res.json();
                if (data.hotels?.length > 0) {
                    const h = data.hotels[0]; // Assuming first hotel for admin
                    setHotel(h);
                    setForm({
                        hasInHouseRestaurant: h.hasInHouseRestaurant,
                        zomatoLink: h.zomatoLink || "",
                        swiggyLink: h.swiggyLink || ""
                    });
                }
            } catch (err) {
                console.error("Fetch hotel error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHotel();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotel) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/hotels/${hotel.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert("Property settings updated successfully!");
            }
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: 'var(--text-secondary)' }}>Loading Configuration...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem', maxWidth: '800px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', margin: 0 }}>Property Configuration</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    Manage core hotel features, dining preferences, and digital integrations for {hotel?.name}.
                </p>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <Card title="Dining & Room Service" subtitle="Configure how guests discover and order food">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                            <input
                                type="checkbox"
                                id="restaurant-toggle"
                                checked={form.hasInHouseRestaurant}
                                onChange={e => setForm({ ...form, hasInHouseRestaurant: e.target.checked })}
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <label htmlFor="restaurant-toggle" style={{ fontWeight: 600, cursor: 'pointer' }}>
                                Enable In-House Restaurant Module
                            </label>
                            <Badge variant={form.hasInHouseRestaurant ? "success" : "neutral"} style={{ marginLeft: 'auto' }}>
                                {form.hasInHouseRestaurant ? "Active" : "Disabled"}
                            </Badge>
                        </div>

                        {!form.hasInHouseRestaurant && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'rgba(245,158,11,0.05)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--accent-gold)' }}>External Delivery Integration:</strong> Since you don't have an in-house kitchen, you can provide links to popular delivery platforms. These will be shown on the guest dashboard for easy ordering.
                                </p>
                                <Input
                                    label="Zomato Property Link"
                                    value={form.zomatoLink}
                                    onChange={e => setForm({ ...form, zomatoLink: e.target.value })}
                                    placeholder="https://www.zomato.com/..."
                                />
                                <Input
                                    label="Swiggy Property Link"
                                    value={form.swiggyLink}
                                    onChange={e => setForm({ ...form, swiggyLink: e.target.value })}
                                    placeholder="https://www.swiggy.com/..."
                                />
                            </div>
                        )}
                    </div>
                </Card>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <Button variant="outline" type="button" onClick={() => window.location.reload()}>Discard Changes</Button>
                    <Button variant="primary" type="submit" loading={saving}>Apply Configuration</Button>
                </div>
            </form>
        </div>
    );
}
