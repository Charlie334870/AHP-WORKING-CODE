import { useState } from "react";
import { T, FONT } from "../../theme";
import { fmt, getMrp, getDiscount, getDeliveryEta, getStarRating, renderStars } from "../../utils";

export function ProductCard({ item, onClick }) {
    const { product, bestPrice, availability, shopCount, fastestEta, rankScore, listings } = item;
    const [wishlisted, setWishlisted] = useState(false);

    // Stock Indicator
    let stockColor = T.emerald, stockLabel = "In Stock";
    if (availability === 0) { stockColor = T.crimson; stockLabel = "Out of Stock"; }
    else if (availability < 5) { stockColor = T.amber; stockLabel = `Only ${availability} left`; }

    // Amazon-style pricing
    const mrp = product.mrp || Math.round(bestPrice * 1.25);
    const discountPct = mrp > bestPrice ? Math.round(((mrp - bestPrice) / mrp) * 100) : 0;

    // Star rating (deterministic from product id)
    const { rating, count } = getStarRating(product.id);

    // Delivery ETA
    const eta = getDeliveryEta();

    // Seller info
    const sellerName = listings?.[0]?.shop?.name || "Local Shop";
    const sellerDist = (1 + (product.id.charCodeAt(1) % 8)).toFixed(1); // mock distance

    return (
        <div
            onClick={onClick}
            style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                width: 260,
                flexShrink: 0,
                overflow: "hidden",
            }}
            className="mp-card-hover"
        >
            {/* WISHLIST HEART */}
            <button
                onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
                style={{
                    position: "absolute", top: 12, right: 12, zIndex: 10,
                    width: 32, height: 32, borderRadius: "50%",
                    background: wishlisted ? `${T.crimson}22` : "rgba(0,0,0,0.4)",
                    border: "none", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 16, transition: "all 0.2s",
                    backdropFilter: "blur(4px)",
                }}
            >
                {wishlisted ? "❤️" : "🤍"}
            </button>

            {/* STOCK BADGE */}
            <div style={{
                position: "absolute", top: 12, left: 12, zIndex: 10,
                background: `${stockColor}22`, color: stockColor,
                padding: "4px 10px", borderRadius: 20,
                fontSize: 10, fontWeight: 900, fontFamily: FONT.ui,
                textTransform: "uppercase", letterSpacing: "0.05em",
                backdropFilter: "blur(4px)",
            }}>
                {stockLabel}
            </div>

            {/* IMAGE */}
            <div style={{ width: "100%", height: 160, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {product.image ? (
                    typeof product.image === "string" && product.image.length <= 4
                        ? <span style={{ fontSize: 56, opacity: 0.9 }}>{product.image}</span>
                        : <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                )}
                {/* Shop count pill */}
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: "3px 8px", borderRadius: 6, fontSize: 10, color: T.t2, fontFamily: FONT.mono, fontWeight: 700 }}>
                    {shopCount} {shopCount === 1 ? "Seller" : "Sellers"}
                </div>
            </div>

            {/* CONTENT */}
            <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>

                {/* Brand pill */}
                <div style={{ fontSize: 10, color: T.sky, fontFamily: FONT.ui, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>{product.brand}</div>

                {/* Title */}
                <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.7em" }}>
                    {product.name}
                </div>

                {/* Star Rating */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#FBBF24", fontSize: 13, letterSpacing: 1 }}>{renderStars(+rating)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{rating}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>({count})</span>
                </div>

                {/* PRICE BLOCK */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(bestPrice)}</span>
                    {discountPct > 0 && (
                        <>
                            <span style={{ fontSize: 12, color: T.t3, textDecoration: "line-through" }}>{fmt(mrp)}</span>
                            <span style={{ background: `${T.crimson}22`, color: T.crimson, fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>{discountPct}% off</span>
                        </>
                    )}
                </div>

                {/* Delivery ETA */}
                <div style={{ fontSize: 11, color: eta.fast ? T.emerald : T.t3, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <span>🚚</span> {eta.text}
                </div>

                {/* Seller + Distance */}
                <div style={{ fontSize: 11, color: T.t3, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>📍</span> {sellerName} ({sellerDist} km)
                </div>
            </div>

            {/* CTA */}
            <div style={{ padding: "0 16px 16px" }}>
                <div style={{
                    background: T.amber, color: "#000",
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: 13, fontWeight: 900, fontFamily: FONT.ui,
                    textAlign: "center",
                    boxShadow: `0 4px 12px ${T.amber}44`,
                    transition: "all 0.15s"
                }}>
                    View Details →
                </div>
            </div>
        </div>
    );
}
