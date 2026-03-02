import { useState, useMemo } from "react";
import { T, FONT } from "../theme";
import { CATEGORIES, stockStatus, margin, fmt, downloadCSV, generateCSV } from "../utils";
import { Badge, Btn, Input, Select } from "../components/ui";
import { PurchaseModal } from "../components/PurchaseModal";
import { SaleModal } from "../components/SaleModal";
import { StockAdjustmentModal } from "../components/StockAdjustmentModal";
import { printBarcodeLabels } from "../barcode";

export function InventoryPage({ products, movements, activeShopId, onAdd, onEdit, onSale, onPurchase, onAdjust, toast }) {
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("All");
    const [statusF, setStatusF] = useState("All");
    const [sortBy, setSortBy] = useState("name");
    const [saleP, setSaleP] = useState(null);
    const [purchP, setPurchP] = useState(null);
    const [adjP, setAdjP] = useState(null);

    const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId), [products, activeShopId]);

    const filtered = useMemo(() =>
        shopProducts
            .filter(p => cat === "All" || p.category === cat)
            .filter(p => statusF === "All" || stockStatus(p) === statusF)
            .filter(p => !search || [p.name, p.sku, p.brand, p.supplier].some(s => (s || "").toLowerCase().includes(search.toLowerCase())))
            .sort((a, b) => {
                if (sortBy === "profit") return (b.sellPrice - b.buyPrice) - (a.sellPrice - a.buyPrice);
                if (sortBy === "margin") return +margin(b.buyPrice, b.sellPrice) - +margin(a.buyPrice, a.sellPrice);
                if (sortBy === "stock") return a.stock - b.stock;
                if (sortBy === "value") return b.buyPrice * b.stock - a.buyPrice * a.stock;
                if (sortBy === "sell") return b.sellPrice - a.sellPrice;
                return a.name.localeCompare(b.name);
            }), [shopProducts, cat, statusF, search, sortBy]);

    const counts = {
        out: shopProducts.filter(p => p.stock <= 0).length,
        low: shopProducts.filter(p => p.stock > 0 && p.stock < p.minStock).length,
    };

    const handleGeneratePO = () => {
        const lowItems = shopProducts.filter(p => p.stock < p.minStock);
        if (lowItems.length === 0) {
            toast?.("No items below minimum stock!", "info");
            return;
        }
        // Group by supplier for real PO generation
        const bySupplier = {};
        lowItems.forEach(p => {
            const supplier = p.supplier || "Unknown Supplier";
            if (!bySupplier[supplier]) bySupplier[supplier] = [];
            const reorderQty = Math.max(p.minStock * 2 - p.stock, p.minStock);
            bySupplier[supplier].push({ ...p, reorderQty, estimatedCost: reorderQty * p.buyPrice });
        });
        // Generate CSV
        const headers = ["Supplier", "Product", "SKU", "Category", "Current Stock", "Min Stock", "Reorder Qty", "Buy Price", "Estimated Cost"];
        const rows = [];
        Object.entries(bySupplier).forEach(([supplier, items]) => {
            items.forEach(p => {
                rows.push([supplier, p.name, p.sku, p.category, p.stock, p.minStock, p.reorderQty, p.buyPrice, p.estimatedCost]);
            });
        });
        const totalCost = rows.reduce((s, r) => s + r[8], 0);
        rows.push(["", "", "", "", "", "", "TOTAL:", "", totalCost]);
        const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s/g, "_");
        downloadCSV(`Draft_PO_${dateStr}.csv`, generateCSV(headers, rows));
        toast?.(`Draft PO generated: ${lowItems.length} items across ${Object.keys(bySupplier).length} suppliers · ${fmt(totalCost)} estimated cost`, "success", "📦 PO Downloaded");
    };

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <Input value={search} onChange={setSearch} placeholder="Search name, SKU, brand, supplier…" icon="🔍" />
                </div>
                <Select value={cat} onChange={setCat} style={{ width: 160 }} options={["All", ...CATEGORIES].map(c => ({ value: c, label: c === "All" ? "All Categories" : c }))} />
                <Select value={sortBy} onChange={setSortBy} style={{ width: 180 }} options={[
                    { value: "name", label: "Sort: Name" },
                    { value: "profit", label: "Sort: Profit/unit ↓" },
                    { value: "margin", label: "Sort: Margin % ↓" },
                    { value: "stock", label: "Sort: Stock (low first)" },
                    { value: "value", label: "Sort: Inventory Value ↓" },
                    { value: "sell", label: "Sort: Sell Price ↓" },
                ]} />
                <div style={{ display: "flex", gap: 5 }}>
                    {[["All", "All"], ["ok", "In Stock"], ["low", `Low (${counts.low})`], ["out", `Out (${counts.out})`]].map(([v, l]) => (
                        <button key={v} onClick={() => setStatusF(v)} style={{ background: statusF === v ? (v === "out" ? T.crimson : v === "low" ? T.amber : v === "ok" ? T.emerald : T.sky) : "transparent", color: statusF === v ? "#000" : T.t2, border: `1px solid ${statusF === v ? (v === "out" ? T.crimson : v === "low" ? T.amber : v === "ok" ? T.emerald : T.sky) : T.border}`, borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s" }}>{l}</button>
                    ))}
                </div>
                {(counts.low + counts.out) > 0 && (
                    <Btn variant="sky" size="sm" onClick={handleGeneratePO}>
                        📦 Generate Draft PO ({counts.low + counts.out})
                    </Btn>
                )}
                <Btn variant="subtle" size="sm" onClick={() => {
                    if (filtered.length === 0) { toast?.("No products to print labels for!", "info"); return; }
                    printBarcodeLabels(filtered.slice(0, 30));
                    toast?.(`Printing barcode labels for ${Math.min(filtered.length, 30)} products`, "success", "🏷️ Labels");
                }}>🏷️ Print Labels</Btn>
                <Btn onClick={onAdd} size="sm">＋ Add Product</Btn>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>
                    Showing <span style={{ color: T.t1, fontWeight: 700 }}>{filtered.length}</span> of {shopProducts.length} products
                </div>
            </div>

            {/* Table */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                            {["", "Product", "Cat.", "Buy", "Sell", "Profit", "Margin", "Stock", "Location", "Status", ""].map((h, i) => (
                                <th key={i} style={{ padding: "10px 12px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={11} style={{ padding: "48px", textAlign: "center", color: T.t3, fontFamily: FONT.ui, fontSize: 14 }}>No products match your filters.</td></tr>
                        ) : filtered.map(p => {
                            const profit_u = p.sellPrice - p.buyPrice;
                            const mg = margin(p.buyPrice, p.sellPrice);
                            const st = stockStatus(p);
                            return (
                                <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
                                    <td style={{ padding: "10px 10px 10px 14px", fontSize: 22 }}>{p.image}</td>
                                    <td style={{ padding: "10px 12px", maxWidth: 190 }}>
                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, marginTop: 2 }}>{p.sku}</div>
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                        <span style={{ background: `${T.amber}14`, color: T.amber, fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontFamily: FONT.ui }}>{p.category}</span>
                                    </td>
                                    <td style={{ padding: "10px 12px", color: T.t3, fontFamily: FONT.mono, fontSize: 12 }}>{fmt(p.buyPrice)}</td>
                                    <td style={{ padding: "10px 12px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, fontWeight: 700 }}>{fmt(p.sellPrice)}</td>
                                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 800, color: profit_u > 0 ? T.emerald : T.crimson }}>{fmt(profit_u)}</td>
                                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 12 }}>
                                        <span style={{ color: +mg > 30 ? T.emerald : +mg > 15 ? T.amber : T.crimson, fontWeight: 700 }}>{mg}%</span>
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                        <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 16, color: p.stock === 0 ? T.crimson : p.stock < p.minStock ? T.amber : T.t1 }}>{p.stock}</span>
                                        <span style={{ fontSize: 10, color: T.t4, fontFamily: FONT.mono }}> /{p.minStock}</span>
                                    </td>
                                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{p.location}</td>
                                    <td style={{ padding: "10px 12px" }}><Badge status={st} /></td>
                                    <td style={{ padding: "10px 14px 10px 10px" }}>
                                        <div style={{ display: "flex", gap: 5 }}>
                                            <Btn size="xs" variant="subtle" onClick={() => onEdit(p)}>Edit</Btn>
                                            <Btn size="xs" variant="sky" onClick={() => setPurchP(p)}>📥 Buy</Btn>
                                            <Btn size="xs" variant="amber" onClick={() => setSaleP(p)}>📤 Sell</Btn>
                                            <Btn size="xs" variant="ghost" onClick={() => setAdjP(p)} style={{ borderColor: T.border }}>⚖️</Btn>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <SaleModal open={!!saleP} product={saleP} products={products} onClose={() => setSaleP(null)} onSave={(data) => onSale(data)} toast={toast} />
            <PurchaseModal open={!!purchP} product={purchP} products={products} onClose={() => setPurchP(null)} onSave={(data) => onPurchase(data)} toast={toast} />
            <StockAdjustmentModal open={!!adjP} product={adjP} products={products} onClose={() => setAdjP(null)} onSave={(data) => onAdjust(data)} toast={toast} />
        </div>
    );
}
