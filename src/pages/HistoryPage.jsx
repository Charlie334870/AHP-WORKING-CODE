import { useState, useMemo } from "react";
import { T, FONT } from "../theme";
import { fmt, pct, fmtDate, fmtTime } from "../utils";
import { StatCard, Input, Btn } from "../components/ui";

const TYPE_CFG = {
    PURCHASE: { bg: T.skyBg, color: T.sky, label: "Purchase", sym: "+" },
    SALE: { bg: T.amberGlow, color: T.amber, label: "Sale", sym: "−" },
    ADJUST: { bg: `rgba(167,139,250,0.1)`, color: T.violet, label: "Adjustment", sym: "±" },
};

export function HistoryPage({ movements, activeShopId }) {
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);

    const sorted = useMemo(() => [...shopMovements].sort((a, b) => b.date - a.date), [shopMovements]);
    const filtered = sorted.filter(m => filter === "ALL" || m.type === filter).filter(m => !search || [m.productName, m.invoiceNo, m.supplier, m.customerName].some(s => (s || "").toLowerCase().includes(search.toLowerCase())));

    const totals = useMemo(() => ({
        purchases: shopMovements.filter(m => m.type === "PURCHASE").reduce((s, m) => s + m.total, 0),
        sales: shopMovements.filter(m => m.type === "SALE").reduce((s, m) => s + m.total, 0),
        profit: shopMovements.filter(m => m.type === "SALE").reduce((s, m) => s + (m.profit || 0), 0),
        count_p: shopMovements.filter(m => m.type === "PURCHASE").length,
        count_s: shopMovements.filter(m => m.type === "SALE").length,
    }), [shopMovements]);

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                <StatCard label="Total Purchases" value={fmt(totals.purchases)} icon="📥" color={T.sky} sub={`${totals.count_p} entries`} />
                <StatCard label="Total Sales" value={fmt(totals.sales)} icon="📤" color={T.amber} sub={`${totals.count_s} transactions`} />
                <StatCard label="Total Profit" value={fmt(totals.profit)} icon="📈" color={T.emerald} sub={pct(totals.profit, totals.sales) + " margin"} />
            </div>

            <div style={{ background: T.card, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: T.amber, fontWeight: 500, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 8 }}>
                🔒 <span>Permanent audit trail — all entries are non-editable and auto-logged for accountability.</span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {[["ALL", "All"], ["PURCHASE", "Purchases"], ["SALE", "Sales"], ["ADJUST", "Adjustments"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFilter(v)} style={{ background: filter === v ? (v === "PURCHASE" ? T.sky : v === "SALE" ? T.amber : v === "ADJUST" ? T.violet : T.borderHi) : "transparent", color: filter === v ? "#000" : T.t2, border: `1px solid ${filter === v ? (v === "PURCHASE" ? T.sky : v === "SALE" ? T.amber : v === "ADJUST" ? T.violet : T.borderHi) : T.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s" }}>{l}</button>
                ))}
                <div style={{ flex: 1, minWidth: 180 }}><Input value={search} onChange={setSearch} placeholder="Search product, invoice, customer…" icon="🔍" /></div>
                <Btn variant="subtle" size="sm">⬇ Export CSV</Btn>
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                            {["Date & Time", "Product", "Type", "Qty", "Amount", "Profit", "Invoice", "Party", "Payment", "Details"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: T.t3, fontFamily: FONT.ui }}>No records found.</td></tr>
                        ) : filtered.map((m, i) => {
                            const cfg = TYPE_CFG[m.type] || TYPE_CFG.ADJUST;
                            return (
                                <tr key={m.id} className="row-hover" style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none", background: T.card }}>
                                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                                        <div style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono }}>{fmtDate(m.date)}</div>
                                        <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{fmtTime(m.date)}</div>
                                    </td>
                                    <td style={{ padding: "12px 14px", maxWidth: 160 }}>
                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.productName}</div>
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 700, fontFamily: FONT.ui }}>{cfg.label}</span>
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 900, fontSize: 15, color: m.type === "PURCHASE" ? T.sky : m.type === "SALE" ? T.amber : T.violet }}>
                                        {cfg.sym}{Math.abs(m.qty)}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 600, color: T.t1 }}>{m.total ? fmt(m.total) : <span style={{ color: T.t4 }}>—</span>}</td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: m.profit > 0 ? T.emerald : T.t4 }}>{m.profit ? fmt(m.profit) : <span style={{ color: T.t4 }}>—</span>}</td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{m.invoiceNo || <span style={{ color: T.t4 }}>—</span>}</td>
                                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2, maxWidth: 130 }}>
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {m.type === "PURCHASE" ? m.supplier : m.customerName || "Walk-in"}
                                        </div>
                                        {m.vehicleReg && <div style={{ fontSize: 10, color: T.amber, fontFamily: FONT.mono, marginTop: 2 }}>{m.vehicleReg}</div>}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        {m.payment && <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{m.payment === "Credit" ? <span style={{ color: T.crimson }}>💳 Credit</span> : m.payment}</span>}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontSize: 11, color: T.t3, maxWidth: 140 }}>
                                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note || "—"}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
