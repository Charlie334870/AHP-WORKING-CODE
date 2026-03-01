import { useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, fmtDateTime, daysAgo } from "../../utils";

const STATUS_META = {
    NEW: { label: "Order Placed", icon: "📋", color: T.sky, desc: "Your order has been placed and is awaiting confirmation from the seller." },
    ACCEPTED: { label: "Confirmed by Seller", icon: "✅", color: T.emerald, desc: "The seller has confirmed your order and is preparing it." },
    PACKED: { label: "Packed & Ready", icon: "📦", color: T.amber, desc: "Your order has been packed and is ready for pickup by the delivery partner." },
    DISPATCHED: { label: "Out for Delivery", icon: "🚚", color: T.violet, desc: "Your order is on its way! Delivery partner is en route." },
    DELIVERED: { label: "Delivered", icon: "✓", color: T.emerald, desc: "Your order has been delivered successfully." },
    CANCELLED: { label: "Cancelled", icon: "✕", color: T.crimson, desc: "This order was cancelled." },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

export function OrderTrackingPage({ onBack }) {
    const { orders, shops } = useStore();
    const safeOrders = orders || [];

    // Get customer-facing orders (marketplace orders)
    const myOrders = useMemo(
        () => safeOrders.filter(o => o.address || o.payment?.includes("Escrow") || o.payment?.includes("COD") || o.payment?.includes("Prepaid")).sort((a, b) => b.time - a.time),
        [safeOrders]
    );

    if (myOrders.length === 0) {
        return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 30 }}>← Back to Marketplace</button>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>📦</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>No orders yet</div>
                <p style={{ color: T.t3, marginTop: 8 }}>Your order history will appear here after your first purchase.</p>
                <button onClick={onBack} style={{ marginTop: 24, background: T.amber, color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Start Shopping →</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
            <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 24 }}>← Back to Marketplace</button>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px" }}>My Orders</h1>
            <p style={{ fontSize: 14, color: T.t3, margin: "0 0 32px" }}>{myOrders.length} order{myOrders.length > 1 ? "s" : ""} found</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {myOrders.map(order => {
                    const shop = (shops || []).find(s => s.id === order.shopId);
                    const statusMeta = STATUS_META[order.status] || STATUS_META.NEW;
                    const currentFlowIdx = FLOW.indexOf(order.status);
                    const isCancelled = order.status === "CANCELLED";

                    return (
                        <div key={order.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>

                            {/* Order Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{order.id}</div>
                                    <div style={{ background: `${statusMeta.color}22`, color: statusMeta.color, padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                                        {statusMeta.icon} {statusMeta.label}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(order.total)}</div>
                                    <div style={{ fontSize: 11, color: T.t3 }}>{daysAgo(order.time)}</div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

                                {/* Left: Order Details */}
                                <div style={{ padding: "24px 28px", borderRight: `1px solid ${T.border}` }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Order Details</div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                        <span style={{ fontSize: 20 }}>{shop?.imageEmoji || "🏪"}</span>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{shop?.name || "Local Shop"}</div>
                                            <div style={{ fontSize: 12, color: T.t3 }}>{shop?.address || ""}</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.7 }}>
                                        <div><strong>Items:</strong> {order.items}</div>
                                        <div><strong>Payment:</strong> {order.payment}</div>
                                        {order.address && <div><strong>Address:</strong> {order.address}</div>}
                                        <div><strong>Placed:</strong> {fmtDateTime(order.time)}</div>
                                    </div>
                                </div>

                                {/* Right: Tracking Timeline */}
                                <div style={{ padding: "24px 28px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Tracking Timeline</div>

                                    {isCancelled ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 20, background: `${T.crimson}11`, border: `1px solid ${T.crimson}33`, borderRadius: 12 }}>
                                            <span style={{ fontSize: 28 }}>✕</span>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: T.crimson }}>Order Cancelled</div>
                                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>This order was cancelled by the seller.</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ position: "relative", paddingLeft: 24 }}>
                                            {/* Vertical line */}
                                            <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: T.border }} />

                                            {FLOW.map((status, i) => {
                                                const meta = STATUS_META[status];
                                                const isDone = i <= currentFlowIdx;
                                                const isCurrent = i === currentFlowIdx;
                                                const isPending = i > currentFlowIdx;

                                                // Mock timestamps (relative to order time)
                                                const stepTime = isDone ? order.time + i * 1200000 : null; // 20 min intervals

                                                return (
                                                    <div key={status} style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: i < FLOW.length - 1 ? 20 : 0, position: "relative" }}>
                                                        {/* Dot */}
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                                            background: isDone ? meta.color : T.surface,
                                                            border: `2px solid ${isDone ? meta.color : T.border}`,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            zIndex: 2, position: "relative", left: -12,
                                                            boxShadow: isCurrent ? `0 0 12px ${meta.color}66` : "none",
                                                            animation: isCurrent ? "pulse 2s infinite" : "none"
                                                        }}>
                                                            {isDone && <span style={{ fontSize: 10, color: "#000", fontWeight: 900 }}>✓</span>}
                                                        </div>

                                                        {/* Content */}
                                                        <div style={{ flex: 1, marginTop: -2 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? T.t1 : T.t3 }}>{meta.label}</div>
                                                            {isDone && stepTime && (
                                                                <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{fmtDateTime(stepTime)}</div>
                                                            )}
                                                            {isCurrent && (
                                                                <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, marginTop: 4 }}>{meta.desc}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
