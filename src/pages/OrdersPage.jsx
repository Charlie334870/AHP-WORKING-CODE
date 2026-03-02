import { useState, useMemo } from "react";
import { T, FONT } from "../theme";
import { fmt, daysAgo } from "../utils";
import { Btn } from "../components/ui";
import { useStore } from "../store";

const S = {
    NEW: { bg: `${T.sky}18`, color: T.sky, label: "New Order", next: "Accept" },
    ACCEPTED: { bg: "rgba(45,212,191,0.12)", color: "#2DD4BF", label: "Accepted", next: "Pack" },
    PACKED: { bg: `${T.amber}18`, color: T.amber, label: "Packed", next: "Dispatch" },
    DISPATCHED: { bg: `${T.violet}18`, color: T.violet, label: "Dispatched", next: "Delivered" },
    DELIVERED: { bg: `${T.emerald}18`, color: T.emerald, label: "Delivered", next: null },
    CANCELLED: { bg: `${T.crimson}18`, color: T.crimson, label: "Cancelled", next: null },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

export function OrdersPage({ products, activeShopId, onSale, toast }) {
    const { orders, saveOrders } = useStore();

    const shopOrders = useMemo(() => orders.filter(o => o.shopId === activeShopId).sort((a, b) => b.time - a.time), [orders, activeShopId]);

    const advance = id => saveOrders(orders.map(o => { if (o.id !== id) return o; const i = FLOW.indexOf(o.status); return i === -1 || i === FLOW.length - 1 ? o : { ...o, status: FLOW[i + 1] }; }));
    const reject = id => saveOrders(orders.map(o => o.id !== id ? o : { ...o, status: "CANCELLED" }));

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                {["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED"].map(s => {
                    const m = S[s]; const cnt = shopOrders.filter(o => o.status === s).length;
                    return (
                        <div key={s} style={{ background: m.bg, border: `1px solid ${m.color}28`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: m.color, fontFamily: FONT.mono }}>{cnt}</div>
                            <div style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                        </div>
                    );
                })}
            </div>
            {shopOrders.map(o => {
                const m = S[o.status];
                return (
                    <div key={o.id} className="card-hover" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                        <div style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700, fontSize: 14, minWidth: 62 }}>{o.id}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{o.customer}</div>
                            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{o.items} · {daysAgo(o.time)} · 📱{o.phone}</div>
                            {o.vehicle && <div style={{ fontSize: 11, color: T.amber, fontFamily: FONT.mono, marginTop: 2 }}>🚗 {o.vehicle}</div>}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 17, color: T.t1, fontFamily: FONT.mono }}>{fmt(o.total)}</div>
                        <span style={{ background: m.bg, color: m.color, fontSize: 11, padding: "4px 12px", borderRadius: 99, fontWeight: 700, fontFamily: FONT.ui }}>{m.label}</span>
                        {m.next && <Btn size="sm" variant="emerald" onClick={() => advance(o.id)}>✓ {m.next}</Btn>}
                        {o.status === "NEW" && <Btn size="sm" variant="danger" onClick={() => reject(o.id)}>✕ Reject</Btn>}
                    </div>
                );
            })}
        </div>
    );
}
