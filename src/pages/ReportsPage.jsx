import { useMemo, useState } from "react";
import { T, FONT } from "../theme";
import { fmt, daysAgo, pct } from "../utils";
import { StatCard, Btn } from "../components/ui";

export function ReportsPage({ movements, activeShopId }) {
    const [view, setView] = useState("overview");

    const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);

    // Financials
    const stats = useMemo(() => {
        let sales = 0;
        let purchases = 0;
        let pnl = 0;
        let outGst = 0; // Collected on sales
        let inGst = 0;  // Paid on purchases

        const receivables = {}; // Customers owing money
        const payables = {};    // Suppliers owed money

        shopMovements.forEach(m => {
            if (m.type === "SALE") {
                sales += m.total;
                pnl += m.profit || 0;
                outGst += m.gstAmount || 0;

                if (m.paymentMode === "Credit" || m.paymentStatus === "pending") {
                    const cust = m.customerName || "Unknown Customer";
                    receivables[cust] = (receivables[cust] || 0) + m.total;
                }
            } else if (m.type === "PURCHASE") {
                purchases += m.total;
                inGst += m.gstAmount || 0;

                if (m.paymentMode === "Credit" || m.paymentStatus === "pending") {
                    const supp = m.supplierName || "Unknown Supplier";
                    payables[supp] = (payables[supp] || 0) + m.total;
                }
            }
        });

        // Convert dicts to arrays and sort by highest debt
        const recList = Object.entries(receivables).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
        const payList = Object.entries(payables).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

        const recTotal = recList.reduce((s, i) => s + i.amount, 0);
        const payTotal = payList.reduce((s, i) => s + i.amount, 0);

        return {
            sales, purchases, pnl, outGst, inGst,
            netGst: outGst - inGst, // Positive means payable to govt, negative means input credit
            recList, recTotal,
            payList, payTotal
        };
    }, [shopMovements]);

    // Generic Table Renderer
    const renderDebtTable = (title, list, isReceivable) => (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", flex: 1, minWidth: 300 }}>
            <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, color: T.t1, fontSize: 16 }}>{title}</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 900, color: isReceivable ? T.emerald : T.crimson }}>
                    {fmt(list.reduce((s, x) => s + x.amount, 0))}
                </div>
            </div>
            {list.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: T.t3, fontSize: 14 }}>No pending {title.toLowerCase()}.</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                        {list.map((item, i) => (
                            <tr key={i} className="row-hover" style={{ borderBottom: i < list.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                <td style={{ padding: "14px 20px", fontWeight: 600, color: T.t2 }}>{item.name}</td>
                                <td style={{ padding: "14px 20px", textAlign: "right", fontFamily: FONT.mono, fontWeight: 800, color: T.t1 }}>{fmt(item.amount)}</td>
                                <td style={{ padding: "14px 20px", textAlign: "right", width: 100 }}>
                                    <Btn size="xs" variant={isReceivable ? "emerald" : "sky"}>{isReceivable ? "Record Pay" : "Settle"}</Btn>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Top Navigation / Segmentation */}
            <div style={{ display: "flex", gap: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
                {[
                    { id: "overview", label: "Financial Overview", icon: "📊" },
                    { id: "gst", label: "GST & Tax Summary", icon: "🏛️" },
                    { id: "parties", label: "Party Ledgers (Udhaar)", icon: "📒" },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)}
                        style={{ background: view === tab.id ? `${T.amber}22` : "transparent", color: view === tab.id ? T.amber : T.t3, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 8, transition: "0.2s" }}
                        className="btn-hover-subtle">
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* VIEWS */}

            {view === "overview" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        <StatCard label="Total Net Sales" value={fmt(stats.sales)} color={T.emerald} icon="📈" />
                        <StatCard label="Total Purchases" value={fmt(stats.purchases)} color={T.sky} icon="📥" />
                        <StatCard label="Gross Profit" value={fmt(stats.pnl)} color={T.amber} icon="💰" sub={`Margin: ${pct(stats.pnl, stats.sales)}`} />
                    </div>
                </div>
            )}

            {view === "gst" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, marginBottom: 24 }}>GST Calculation Worksheet</div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px dashed ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Output GST (Collected on Sales)</div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Tax collected from customers to be paid to Govt.</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT.mono, color: T.amber }}>{fmt(stats.outGst)}</div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px dashed ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Input GST (Paid on Purchases)</div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>ITC available from supplier invoices.</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT.mono, color: T.sky }}>— {fmt(stats.inGst)}</div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 0 0", marginTop: 12 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Net GST Liability</div>
                                <div style={{ fontSize: 13, color: stats.netGst > 0 ? T.crimson : T.emerald, fontWeight: 600, marginTop: 4 }}>
                                    {stats.netGst > 0 ? "Amount payable to Government" : "Input Tax Credit Available"}
                                </div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: FONT.mono, color: stats.netGst > 0 ? T.crimson : T.emerald, background: stats.netGst > 0 ? `${T.crimson}11` : `${T.emerald}11`, padding: "12px 24px", borderRadius: 12 }}>
                                {fmt(Math.abs(stats.netGst))} {stats.netGst < 0 && <span style={{ fontSize: 14 }}> (Cr)</span>}
                            </div>
                        </div>

                        <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
                            <Btn variant="primary">Generate GSTR-3B Excel</Btn>
                            <Btn variant="subtle">Download GSTR-1 Sales Report</Btn>
                        </div>
                    </div>
                </div>
            )}

            {view === "parties" && (
                <div className="fade-in" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {renderDebtTable("Receivables (Customer Udhaar)", stats.recList, true)}
                    {renderDebtTable("Payables (Supplier Udhaar)", stats.payList, false)}
                </div>
            )}

        </div>
    );
}
