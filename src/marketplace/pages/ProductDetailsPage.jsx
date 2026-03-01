import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, pct, margin, getStarRating, renderStars, getDeliveryEta, getDiscount, getMrp } from "../../utils";
import { ProductComparisonModal } from "../components/ProductComparisonModal";

export function ProductDetailsPage({ productId, onBack }) {
    const { products, shops, selectedVehicle, cart, saveCart, setIsCartOpen } = useStore();
    const [qty, setQty] = useState(1);
    const [showBuyBox, setShowBuyBox] = useState(false);
    const [activeTab, setActiveTab] = useState("specs"); // specs | reviews | shipping

    const productListings = useMemo(() => {
        if (!products || !Array.isArray(products)) return [];
        // Find the base product (could be any shop's copy)
        const baseProduct = products.find(p => p.id === productId);
        const sku = baseProduct?.sku;

        return products.filter(p => (p.id === productId || (sku && p.sku === sku)) && p.stock > 0)
            .map(p => {
                const shop = shops?.find(s => s.id === p.shopId);
                const dist = (2 + (p.shopId?.charCodeAt(1) % 8 || 0)).toFixed(1);
                return { ...p, shop, distance: +dist };
            })
            .sort((a, b) => {
                // Buy Box Algorithm: (1/price * 0.6) + (1/distance * 0.2) + (rating/5 * 0.2)
                const scoreA = (1 / a.sellPrice) * 0.6 + (1 / (a.distance + 0.1)) * 0.2 + ((a.shop?.rating || 4) / 5) * 0.2;
                const scoreB = (1 / b.sellPrice) * 0.6 + (1 / (b.distance + 0.1)) * 0.2 + ((b.shop?.rating || 4) / 5) * 0.2;
                return scoreB - scoreA;
            });
    }, [products, productId, shops]);

    const buyBoxWinner = productListings[0];
    const otherSellers = productListings.slice(1);

    if (!buyBoxWinner) {
        return (
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t2, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    ← Back to Marketplace
                </button>
                <div style={{ padding: 60, textAlign: "center", background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🚫</div>
                    <div style={{ fontSize: 18, color: T.t1, fontWeight: 700 }}>Product currently unavailable</div>
                    <div style={{ fontSize: 14, color: T.t3, marginTop: 8 }}>Check back later or search for alternatives.</div>
                </div>
            </div>
        );
    }

    // Fitment
    const isFit = selectedVehicle && buyBoxWinner.compatibleVehicles.some(v => {
        const vLower = v.toLowerCase();
        const make = (selectedVehicle.make || selectedVehicle.brand || "").toLowerCase();
        const model = (selectedVehicle.model || "").toLowerCase();
        return vLower.includes("universal") || vLower.includes(make) || (model && vLower.includes(model));
    });

    // Rating
    const { rating, count } = getStarRating(buyBoxWinner.id);
    const eta = getDeliveryEta();
    const mrp = getMrp(buyBoxWinner);
    const discountPct = getDiscount(buyBoxWinner);

    const handleAddToCart = (listing) => {
        const itemIndex = cart.findIndex(i => i.listing.product_id === listing.id && i.listing.shop_id === listing.shopId);
        let newCart = [...cart];

        if (itemIndex > -1) {
            newCart[itemIndex].qty += qty;
        } else {
            newCart.push({
                qty: qty,
                product: { name: listing.name, brand: listing.brand, category: listing.category, sku: listing.sku, image: listing.image },
                listing: {
                    shop_id: listing.shopId,
                    shop: listing.shop,
                    product_id: listing.id,
                    selling_price: listing.sellPrice,
                    mrp: listing.mrp,
                    stock: listing.stock,
                    product: { name: listing.name },
                }
            });
        }
        saveCart(newCart);
        setIsCartOpen(true);
    };

    // Specs data (from product fields or defaults)
    const specs = [
        { label: "Brand", value: buyBoxWinner.brand },
        { label: "SKU", value: buyBoxWinner.sku },
        { label: "Category", value: buyBoxWinner.category },
        { label: "GST Rate", value: `${buyBoxWinner.gstRate || 18}%` },
        { label: "Unit", value: buyBoxWinner.unit || "pcs" },
        { label: "Compatible Vehicles", value: (buyBoxWinner.compatibleVehicles || []).join(", ") },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: T.t3 }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sky, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>← Marketplace</button>
                <span>›</span>
                <span>{buyBoxWinner.category}</span>
                <span>›</span>
                <span style={{ color: T.t2 }}>{buyBoxWinner.brand}</span>
            </div>

            <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Left: Image */}
                <div style={{ flex: "1 1 40%", minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: "1/1", background: T.card, border: `1px solid ${T.border}`, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, position: "relative", overflow: "hidden" }}>
                        <span style={{ animation: "float 6s ease-in-out infinite" }}>{buyBoxWinner.image || "⚙️"}</span>
                        {isFit && (
                            <div style={{ position: "absolute", top: 20, left: 20, background: T.emerald, color: "#000", padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 16px ${T.emerald}66` }}>
                                ✓ EXACT FIT
                            </div>
                        )}
                        {discountPct > 10 && (
                            <div style={{ position: "absolute", top: 20, right: 20, background: T.crimson, color: "#fff", padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 900 }}>
                                {discountPct}% OFF
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details */}
                <div style={{ flex: "1 1 50%", minWidth: 320, display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Brand + SKU */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={{ background: `${T.sky}22`, color: T.sky, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{buyBoxWinner.brand}</span>
                            <span style={{ color: T.t3, fontSize: 12, fontFamily: FONT.mono }}>SKU: {buyBoxWinner.sku}</span>
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, lineHeight: 1.2, margin: 0 }}>
                            {buyBoxWinner.name}
                        </h1>

                        {/* Star Rating */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                            <span style={{ color: "#FBBF24", fontSize: 15 }}>{renderStars(+rating)}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{rating}</span>
                            <span style={{ fontSize: 13, color: T.t3 }}>({count} ratings)</span>
                        </div>

                        <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.6, marginTop: 12 }}>
                            {buyBoxWinner.description || "Premium automotive spare part designed for high performance, durability, and guaranteed fitment."}
                        </p>
                    </div>

                    {/* Fitment Banner */}
                    {selectedVehicle && (
                        <div style={{ padding: "14px 20px", background: isFit ? `${T.emerald}11` : `${T.crimson}11`, border: `1px solid ${isFit ? T.emerald : T.crimson}44`, borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ fontSize: 22 }}>{isFit ? "✅" : "❌"}</div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: isFit ? T.emerald : T.crimson }}>
                                    {isFit ? `Guaranteed to fit your ${selectedVehicle.make} ${selectedVehicle.model}` : `Does NOT fit your ${selectedVehicle.make} ${selectedVehicle.model}`}
                                </div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.variant}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price Block */}
                    <div style={{ padding: "20px 0", borderTop: `1px solid ${T.borderHi}`, borderBottom: `1px solid ${T.borderHi}` }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                            <div style={{ fontSize: 36, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, lineHeight: 1 }}>
                                {fmt(buyBoxWinner.sellPrice)}
                            </div>
                            <div style={{ paddingBottom: 4 }}>
                                <div style={{ fontSize: 14, color: T.t3, textDecoration: "line-through" }}>MRP: {fmt(mrp)}</div>
                                {discountPct > 0 && <div style={{ fontSize: 14, color: T.amber, fontWeight: 700 }}>Save {fmt(mrp - buyBoxWinner.sellPrice)} ({discountPct}% off)</div>}
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Inclusive of all taxes</div>

                        {/* Delivery ETA */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                            <span style={{ fontSize: 16 }}>🚚</span>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: eta.fast ? T.emerald : T.t1 }}>Get it {eta.text}</div>
                                <div style={{ fontSize: 12, color: T.t3 }}>Hyperlocal delivery via Porter/Dunzo</div>
                            </div>
                        </div>

                        {/* Seller */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.card, padding: "14px 16px", borderRadius: 12, border: `1px solid ${T.border}`, marginTop: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ fontSize: 24 }}>{buyBoxWinner.shop?.imageEmoji || "🏪"}</div>
                                <div>
                                    <div style={{ fontSize: 12, color: T.t3 }}>Sold by</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{buyBoxWinner.shop?.name}</div>
                                    <div style={{ fontSize: 11, color: T.t3 }}>⭐ {buyBoxWinner.shop?.rating} · {buyBoxWinner.distance} km away</div>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, color: T.emerald, fontWeight: 800 }}>In Stock</div>
                                <div style={{ fontSize: 11, color: T.t3 }}>{buyBoxWinner.stock} units</div>
                            </div>
                        </div>
                    </div>

                    {/* Qty + Add to Cart */}
                    <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 10 }}>
                            <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 44, height: 44, background: "transparent", border: "none", color: T.t2, fontSize: 18, cursor: "pointer" }}>−</button>
                            <div style={{ width: 44, textAlign: "center", fontSize: 16, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{qty}</div>
                            <button onClick={() => setQty(Math.min(buyBoxWinner.stock, qty + 1))} style={{ width: 44, height: 44, background: "transparent", border: "none", color: T.t2, fontSize: 18, cursor: "pointer" }}>+</button>
                        </div>
                        <button onClick={() => handleAddToCart(buyBoxWinner)} style={{ flex: 1, background: T.amber, color: "#000", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: `0 8px 24px ${T.amber}44`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} className="btn-hover-solid">
                            Add to Cart →
                        </button>
                    </div>

                    {/* Compare Sellers */}
                    {otherSellers.length > 0 && (
                        <button onClick={() => setShowBuyBox(true)} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.t2, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", transition: "0.2s" }} className="btn-hover-subtle">
                            🔄 Compare {otherSellers.length} other seller{otherSellers.length > 1 ? "s" : ""} · Starting from {fmt(otherSellers[0]?.sellPrice)}
                        </button>
                    )}
                </div>
            </div>

            {/* OTHER SELLERS TABLE */}
            {otherSellers.length > 0 && (
                <div style={{ marginTop: 40, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 16 }}>🏪 Other Sellers ({otherSellers.length})</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                {["Shop Name", "Distance", "Price", "Stock", "Rating", ""].map(h => (
                                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {otherSellers.map(seller => (
                                <tr key={seller.shopId} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: T.t1 }}>{seller.shop?.name}</td>
                                    <td style={{ padding: "12px", fontSize: 13, color: T.t2 }}>{seller.distance} km</td>
                                    <td style={{ padding: "12px", fontSize: 14, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{fmt(seller.sellPrice)}</td>
                                    <td style={{ padding: "12px", fontSize: 13, color: seller.stock < 5 ? T.amber : T.emerald, fontWeight: 700 }}>{seller.stock}</td>
                                    <td style={{ padding: "12px", fontSize: 13, color: "#FBBF24" }}>⭐ {seller.shop?.rating}</td>
                                    <td style={{ padding: "12px" }}>
                                        <button onClick={() => handleAddToCart(seller)} style={{ background: `${T.amber}22`, border: `1px solid ${T.amber}55`, color: T.amber, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                                            Add to Cart
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TABS: Specifications | Reviews | Shipping */}
            <div style={{ marginTop: 40 }}>
                <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
                    {[["specs", "📋 Specifications"], ["reviews", "⭐ Reviews"], ["shipping", "🚚 Shipping & Returns"]].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                background: "transparent", border: "none", borderBottom: activeTab === key ? `2px solid ${T.amber}` : "2px solid transparent",
                                color: activeTab === key ? T.amber : T.t3, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                                marginBottom: -2, transition: "all 0.15s"
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === "specs" && (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                        {specs.map((s, i) => (
                            <div key={s.label} style={{ display: "flex", borderBottom: i < specs.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                <div style={{ flex: "0 0 200px", padding: "12px 16px", background: T.surface, fontSize: 13, fontWeight: 700, color: T.t2 }}>{s.label}</div>
                                <div style={{ flex: 1, padding: "12px 16px", fontSize: 13, color: T.t1 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "reviews" && (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <div style={{ fontSize: 36, fontWeight: 900, color: T.t1 }}>{rating}</div>
                            <div>
                                <div style={{ color: "#FBBF24", fontSize: 18 }}>{renderStars(+rating)}</div>
                                <div style={{ fontSize: 13, color: T.t3 }}>{count} ratings</div>
                            </div>
                        </div>
                        {/* Mock reviews */}
                        {[
                            { name: "Rahul M.", stars: 5, text: "Exact fit for my Swift. Installed in 30 min. Great quality.", days: 3 },
                            { name: "Suresh K.", stars: 4, text: "Good quality, delivery was quick. Slightly noisy for first 100 km then settled.", days: 7 },
                            { name: "Mohammed A.", stars: 5, text: "Been using Bosch for years. This is the real OEM quality. Highly recommended.", days: 14 },
                        ].map((r, i) => (
                            <div key={i} style={{ borderTop: `1px solid ${T.border}`, padding: "16px 0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{r.name}</span>
                                        <span style={{ color: "#FBBF24", fontSize: 12 }}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: T.t3 }}>{r.days} days ago</span>
                                </div>
                                <p style={{ fontSize: 13, color: T.t2, margin: "6px 0 0", lineHeight: 1.5 }}>{r.text}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "shipping" && (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                        {[
                            { icon: "🚚", title: "Hyperlocal Delivery", desc: "Delivered via Porter/Dunzo from the nearest shop within 2-4 hours." },
                            { icon: "🔄", title: "Easy Returns", desc: "Return within 7 days if the part doesn't fit or is defective. Full refund to original payment method." },
                            { icon: "🛡️", title: "Escrow Protection", desc: "Payment is held in escrow. Seller receives money only after you confirm delivery and fitment." },
                            { icon: "📦", title: "Packaging", desc: "Parts are shipped in the original manufacturer's packaging with protective wrapping." },
                        ].map(item => (
                            <div key={item.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                <span style={{ fontSize: 22 }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{item.title}</div>
                                    <div style={{ fontSize: 13, color: T.t3, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ProductComparisonModal
                open={showBuyBox}
                product={{ id: productId, name: buyBoxWinner.name, brand: buyBoxWinner.brand, category: buyBoxWinner.category, sku: buyBoxWinner.sku }}
                onClose={() => setShowBuyBox(false)}
            />
        </div>
    );
}
