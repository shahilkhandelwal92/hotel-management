"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Edit3, Leaf, Plus, Search, Trash2, Utensils } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "../restaurant.module.css";

type MenuItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    isVeg: boolean;
    spiceLevel: string;
};

type StockItem = {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    minAlert: number;
};

const emptyMenu = { name: "", category: "", price: "", isVeg: true, spiceLevel: "Medium" };
const emptyStock = { itemName: "", quantity: "", unit: "kg", minAlert: "" };

export default function MenuStockPage() {
    const [tab, setTab] = useState<"menu" | "stock">("menu");
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [showStock, setShowStock] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
    const [editingStock, setEditingStock] = useState<StockItem | null>(null);
    const [menuForm, setMenuForm] = useState(emptyMenu);
    const [stockForm, setStockForm] = useState(emptyStock);

    const load = useCallback(async () => {
        setLoading(true);
        const [menuResponse, stockResponse] = await Promise.all([
            fetch("/api/menu"),
            fetch("/api/kitchen/stock"),
        ]);
        const [menuData, stockData] = await Promise.all([menuResponse.json(), stockResponse.json()]);
        if (!menuResponse.ok) setError(menuData.error || "Menu could not be loaded.");
        if (!stockResponse.ok) setError(stockData.error || "Stock could not be loaded.");
        setMenuItems(menuData.menuItems || []);
        setStock(stockData.stock || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const visibleMenu = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return menuItems.filter((item) => !normalized || `${item.name} ${item.category}`.toLowerCase().includes(normalized));
    }, [menuItems, query]);
    const visibleStock = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return stock.filter((item) => !normalized || item.itemName.toLowerCase().includes(normalized));
    }, [query, stock]);

    const openMenu = (item?: MenuItem) => {
        setEditingMenu(item || null);
        setMenuForm(item ? {
            name: item.name,
            category: item.category,
            price: String(item.price),
            isVeg: item.isVeg,
            spiceLevel: item.spiceLevel,
        } : emptyMenu);
        setShowMenu(true);
    };

    const saveMenu = async () => {
        setSaving(true);
        const response = await fetch(editingMenu ? `/api/menu/${editingMenu.id}` : "/api/menu", {
            method: editingMenu ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(menuForm),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Menu item could not be saved.");
        else {
            setShowMenu(false);
            await load();
        }
        setSaving(false);
    };

    const deleteMenu = async (item: MenuItem) => {
        if (!window.confirm(`Delete ${item.name}?`)) return;
        const response = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Menu item could not be deleted.");
        else await load();
    };

    const openStock = (item?: StockItem) => {
        setEditingStock(item || null);
        setStockForm(item ? {
            itemName: item.itemName,
            quantity: String(item.quantity),
            unit: item.unit,
            minAlert: String(item.minAlert),
        } : emptyStock);
        setShowStock(true);
    };

    const saveStock = async () => {
        setSaving(true);
        const response = await fetch("/api/kitchen/stock", {
            method: editingStock ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...stockForm, id: editingStock?.id }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Stock item could not be saved.");
        else {
            setShowStock(false);
            await load();
        }
        setSaving(false);
    };

    const lowStock = stock.filter((item) => item.quantity <= item.minAlert).length;

    return (
        <div className="animate-fade-in">
            <div className={styles.pageHeader}>
                <div>
                    <div className="page-eyebrow">Restaurant control</div>
                    <h1>Menu & stock</h1>
                    <p>Keep the guest menu current and ingredients above reorder level.</p>
                </div>
                <Button onClick={() => tab === "menu" ? openMenu() : openStock()}><Plus size={16} /> Add {tab === "menu" ? "menu item" : "stock item"}</Button>
            </div>

            {error && <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div>}

            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    <button data-active={tab === "menu"} onClick={() => setTab("menu")}><Utensils size={16} /> Menu <span>{menuItems.length}</span></button>
                    <button data-active={tab === "stock"} onClick={() => setTab("stock")}><Boxes size={16} /> Grocery stock <span>{stock.length}</span></button>
                </div>
                <label className={styles.search}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}`} /></label>
            </div>

            {tab === "menu" ? (
                <div className={styles.menuTable}>
                    <div className={styles.tableHead}><span>Item</span><span>Category</span><span>Type</span><span>Spice</span><span>Price</span><span /></div>
                    {visibleMenu.map((item) => (
                        <div className={styles.tableRow} key={item.id}>
                            <span className={styles.itemName}><span data-veg={item.isVeg}>{item.isVeg ? <Leaf size={16} /> : <Utensils size={16} />}</span><strong>{item.name}</strong></span>
                            <span>{item.category}</span>
                            <span><Badge variant={item.isVeg ? "success" : "danger"}>{item.isVeg ? "Vegetarian" : "Non-veg"}</Badge></span>
                            <span>{item.spiceLevel}</span>
                            <span><strong>₹{item.price.toLocaleString("en-IN")}</strong></span>
                            <span className={styles.rowActions}>
                                <button onClick={() => openMenu(item)} aria-label={`Edit ${item.name}`}><Edit3 size={16} /></button>
                                <button onClick={() => deleteMenu(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button>
                            </span>
                        </div>
                    ))}
                    {!loading && visibleMenu.length === 0 && <div className={styles.tableEmpty}>No menu items found.</div>}
                </div>
            ) : (
                <>
                    {lowStock > 0 && (
                        <div className={styles.stockAlert}><AlertTriangle size={18} /><span><strong>{lowStock} ingredients need attention.</strong> Update deliveries as soon as stock arrives.</span></div>
                    )}
                    <div className={styles.stockGrid}>
                        {visibleStock.map((item) => {
                            const low = item.quantity <= item.minAlert;
                            const percentage = item.minAlert > 0 ? Math.min(100, (item.quantity / (item.minAlert * 2)) * 100) : 100;
                            return (
                                <article key={item.id} className={styles.stockCard} data-low={low}>
                                    <div className={styles.stockHead}>
                                        <span><Boxes size={18} /></span>
                                        <button onClick={() => openStock(item)}><Edit3 size={15} /></button>
                                    </div>
                                    <h3>{item.itemName}</h3>
                                    <div className={styles.stockValue}>{item.quantity} <small>{item.unit}</small></div>
                                    <div className={styles.progress}><span style={{ width: `${percentage}%` }} /></div>
                                    <div className={styles.stockFoot}>
                                        <small>Alert below {item.minAlert} {item.unit}</small>
                                        <Badge variant={low ? "danger" : "success"}>{low ? "Reorder" : "Healthy"}</Badge>
                                    </div>
                                </article>
                            );
                        })}
                        {!loading && visibleStock.length === 0 && <div className={styles.tableEmpty}>No stock items found.</div>}
                    </div>
                </>
            )}

            <Modal
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                title={editingMenu ? "Edit menu item" : "Add menu item"}
                footer={<><Button variant="outline" onClick={() => setShowMenu(false)}>Cancel</Button><Button onClick={saveMenu} loading={saving}>Save item</Button></>}
            >
                <div className={styles.formGrid}>
                    <Input label="Item name" value={menuForm.name} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} placeholder="Paneer tikka" />
                    <Input label="Category" value={menuForm.category} onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })} placeholder="Starters" />
                    <Input label="Price (₹)" type="number" min="0" value={menuForm.price} onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })} />
                    <label><span>Spice level</span><select className="select-field" value={menuForm.spiceLevel} onChange={(event) => setMenuForm({ ...menuForm, spiceLevel: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                    <label className={styles.checkField}><input type="checkbox" checked={menuForm.isVeg} onChange={(event) => setMenuForm({ ...menuForm, isVeg: event.target.checked })} /><span>This is a vegetarian item</span></label>
                </div>
            </Modal>

            <Modal
                isOpen={showStock}
                onClose={() => setShowStock(false)}
                title={editingStock ? "Update stock item" : "Add stock item"}
                footer={<><Button variant="outline" onClick={() => setShowStock(false)}>Cancel</Button><Button onClick={saveStock} loading={saving}>Save stock</Button></>}
            >
                <div className={styles.formGrid}>
                    <Input label="Ingredient name" value={stockForm.itemName} onChange={(event) => setStockForm({ ...stockForm, itemName: event.target.value })} placeholder="Basmati rice" />
                    <Input label="Current quantity" type="number" min="0" step="0.1" value={stockForm.quantity} onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })} />
                    <Input label="Unit" value={stockForm.unit} onChange={(event) => setStockForm({ ...stockForm, unit: event.target.value })} placeholder="kg" />
                    <Input label="Low-stock alert" type="number" min="0" step="0.1" value={stockForm.minAlert} onChange={(event) => setStockForm({ ...stockForm, minAlert: event.target.value })} />
                </div>
            </Modal>
        </div>
    );
}
