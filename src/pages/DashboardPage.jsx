import { useState, useMemo } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { T, FONT } from "../theme";
import { CATEGORIES, fmt, fmtN, pct, stockStatus, STATUS, margin, getOverduePayments, generateReminderMessage, getExpiringProducts } from "../utils";
import { StatCard, ChartTip, Badge, Btn } from "../components/ui";

const PIE_C = [T.amber, T.sky, T.emerald, T.violet, "#FB923C", "#F472B6", "#34D399", "#60A5FA"];

export function DashboardPage({ products, movements, orders, activeShopId, onNavigate, jobCards, parties, vehicles }) {
  const [period, setPeriod] = useState("30");
  const [profitView, setProfitView] = useState("unit_profit");

  const now = Date.now();
  const days = +period;
  const cutoff = now - days * 86400000;
  const prevCut = now - days * 2 * 86400000;

  // 1. FILTER BY ACTIVE SHOP
  const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId), [products, activeShopId]);
  const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);

  // 2. TIME FILTERING
  const curMov = useMemo(() => shopMovements.filter(m => m.date >= cutoff), [shopMovements, cutoff]);
  const prevMov = useMemo(() => shopMovements.filter(m => m.date >= prevCut && m.date < cutoff), [shopMovements, prevCut, cutoff]);

  const curSales = curMov.filter(m => m.type === "SALE");
  const curPurch = curMov.filter(m => m.type === "PURCHASE");

  const revenue = curSales.reduce((s, m) => s + m.total, 0);
  const expenses = curPurch.reduce((s, m) => s + m.total, 0);
  const profit = curSales.reduce((s, m) => s + (m.profit || 0), 0);
  const units = curSales.reduce((s, m) => s + m.qty, 0);
  const discounts = curSales.reduce((s, m) => s + (m.discount || 0), 0);

  const prevRev = prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + m.total, 0);
  const prevProf = prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + (m.profit || 0), 0);

  const revTrend = prevRev > 0 ? (((revenue - prevRev) / prevRev) * 100).toFixed(0) : null;
  const profTrend = prevProf > 0 ? (((profit - prevProf) / prevProf) * 100).toFixed(0) : null;

  // inventory metrics
  const invValue = shopProducts.reduce((s, p) => s + (p.buyPrice * p.stock), 0);
  const potProfit = shopProducts.reduce((s, p) => s + ((p.sellPrice - p.buyPrice) * p.stock), 0);
  const lowProducts = shopProducts.filter(p => stockStatus(p) !== "ok");

  // Accounts Receivable (Udhaar)
  const pendingReceivables = shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
  const creditCustomers = new Set(shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").map(m => m.customerName)).size;

  // Pending Online Orders
  const pendingOrderCount = (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed")).length;

  // per-product stats
  const prodStats = useMemo(() =>
    shopProducts.map(p => {
      const s = curSales.filter(m => m.productId === p.id);
      const pu = curPurch.filter(m => m.productId === p.id);
      const sold = s.reduce((t, m) => t + m.qty, 0);
      const revP = s.reduce((t, m) => t + m.total, 0);
      const profP = s.reduce((t, m) => t + (m.profit || 0), 0);
      const bought = pu.reduce((t, m) => t + m.qty, 0);
      const spentP = pu.reduce((t, m) => t + m.total, 0);
      const profitPU = p.sellPrice - p.buyPrice;
      const mg = +margin(p.buyPrice, p.sellPrice);
      return { ...p, sold, revP, profP, bought, spentP, profitPU, mg };
    }), [shopProducts, curSales, curPurch]);

  // chart data: daily
  const chartData = useMemo(() => {
    const pts = Math.min(days, 30);
    return Array.from({ length: pts }, (_, i) => {
      const end = now - i * 86400000;
      const start = end - 86400000;
      const ds = shopMovements.filter(m => m.type === "SALE" && m.date >= start && m.date < end);
      const dp = shopMovements.filter(m => m.type === "PURCHASE" && m.date >= start && m.date < end);
      const lbl = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return { date: lbl, Revenue: ds.reduce((t, m) => t + m.total, 0), Profit: ds.reduce((t, m) => t + (m.profit || 0), 0), Expenses: dp.reduce((t, m) => t + m.total, 0) };
    }).reverse();
  }, [shopMovements, days, now]);

  // category pie
  const catPie = useMemo(() =>
    CATEGORIES.map(c => ({
      name: c,
      value: curSales.filter(m => shopProducts.find(p => p.id === m.productId)?.category === c).reduce((t, m) => t + m.total, 0)
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value), [curSales, shopProducts]);

  // sorted profit list
  const sortedProds = [...prodStats].sort((a, b) => {
    if (profitView === "unit_profit") return b.profitPU - a.profitPU;
    if (profitView === "total_profit") return b.profP - a.profP;
    if (profitView === "margin") return b.mg - a.mg;
    if (profitView === "revenue") return b.revP - a.revP;
    return 0;
  });

  // signal
  const signal = p => {
    if (p.profitPU < 0) return { icon: "🔴", label: "Loss Product", color: T.crimson };
    if (p.mg < 10) return { icon: "🟡", label: "Very Low Margin", color: T.amber };
    if (p.sold === 0) return { icon: "💤", label: "No Sales", color: T.t3 };
    if (p.mg > 35 && p.sold > 3) return { icon: "🏆", label: "Star Performer", color: T.emerald };
    if (p.mg > 20) return { icon: "✅", label: "Healthy", color: T.emerald };
    return { icon: "⚡", label: "Average", color: T.sky };
  };

  return (
    <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.t3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4, fontFamily: FONT.ui }}>Period:</span>
        {[["7", "7D"], ["30", "30D"], ["90", "3M"], ["180", "6M"], ["365", "1Y"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ background: period === v ? T.amber : "transparent", color: period === v ? "#000" : T.t2, border: `1px solid ${period === v ? T.amber : T.border}`, borderRadius: 7, padding: "5px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s" }}>{l}</button>
        ))}
        <span style={{ flex: 1 }} />

        {/* Marketplace Sync Status */}
        <div style={{ background: `${T.emerald}14`, border: `1px solid ${T.emerald}44`, borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 8px ${T.emerald}` }} className="pulse" />
          <span style={{ fontSize: 13, color: T.emerald, fontWeight: 800 }}>Marketplace Sync Active</span>
          <span style={{ fontSize: 11, color: T.t3, marginLeft: 8 }}>Rating: ⭐ 4.9 (Top Tier)</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <StatCard label="Revenue" value={fmt(revenue)} icon="💰" color={T.amber} trend={revTrend} sub="Total sales amount" glow="amber" />
        <StatCard label="Profit" value={fmt(profit)} icon="📈" color={T.emerald} trend={profTrend} sub={`${pct(profit, revenue)} margin`} glow="emerald" />
        <StatCard label="Purchases" value={fmt(expenses)} icon="🛒" color={T.sky} sub={`${curPurch.length} entries`} />
        <StatCard label="Units Sold" value={fmtN(units)} icon="📦" color={T.violet} sub={`${curSales.length} transactions`} />
        <StatCard label="Udhaar (Receivables)" value={fmt(pendingReceivables)} icon="📋" color={T.crimson} sub={`${creditCustomers} customers owe you`} glow={pendingReceivables > 0 ? "crimson" : undefined} />
        <StatCard label="Online Orders" value={String(pendingOrderCount)} icon="🌐" color={T.sky} sub={pendingOrderCount > 0 ? "Requires action" : "All clear"} glow={pendingOrderCount > 0 ? "sky" : undefined} />
      </div>

      {/* TREND CHART */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 20px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 16, letterSpacing: "-0.01em" }}>Revenue, Profit & Expenses — {days}-Day Trend</div>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={chartData}>
            <defs>
              {[[T.amber, "a"], [T.emerald, "e"], [T.sky, "s"]].map(([c, id]) => (
                <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.25} /><stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: T.t3, fontSize: 10, fontFamily: FONT.ui }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: T.t3, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT.ui, paddingTop: 12 }} />
            <Area type="monotone" dataKey="Revenue" stroke={T.amber} fill="url(#ga)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Profit" stroke={T.emerald} fill="url(#ge)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Expenses" stroke={T.sky} fill="url(#gs)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PROFIT INTELLIGENCE TABLE */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, letterSpacing: "-0.01em" }}>💡 Product Profit Intelligence</div>
          <div style={{ display: "flex", gap: 5 }}>
            {[["unit_profit", "Profit/Unit"], ["margin", "Margin%"], ["total_profit", "Total Profit"], ["revenue", "Revenue"]].map(([v, l]) => (
              <button key={v} onClick={() => setProfitView(v)} style={{ background: profitView === v ? T.amber : "transparent", color: profitView === v ? "#000" : T.t2, border: `1px solid ${profitView === v ? T.amber : T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["#", "Product", "Category", "Buy", "Sell", "Profit/Unit", "Margin", "Sold", "Total Profit", "Signal"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProds.map((p, i) => {
                const sig = signal(p);
                return (
                  <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
                    <td style={{ padding: "10px 12px", color: T.t4, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={{ padding: "10px 12px", maxWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                        <span>{p.image}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: `${T.amber}14`, color: T.amber, fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>{p.category}</span></td>
                    <td style={{ padding: "10px 12px", color: T.t3, fontFamily: FONT.mono, fontSize: 12 }}>{fmt(p.buyPrice)}</td>
                    <td style={{ padding: "10px 12px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{fmt(p.sellPrice)}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 800, color: p.profitPU > 0 ? T.emerald : T.crimson }}>{fmt(p.profitPU)}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 12 }}><span style={{ color: p.mg > 30 ? T.emerald : p.mg > 15 ? T.amber : T.crimson, fontWeight: 700 }}>{p.mg}%</span></td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 700, color: p.sold > 0 ? T.t1 : T.t4 }}>{p.sold}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 800, color: p.profP > 0 ? T.emerald : T.t4 }}>{p.profP > 0 ? fmt(p.profP) : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sig.color, fontFamily: FONT.ui, display: "flex", gap: 5, alignItems: "center" }}>
                        {sig.icon} {sig.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Category Breakdown */}
        {catPie.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14 }}>Sales by Category</div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={catPie} dataKey="value" innerRadius={42} outerRadius={65} paddingAngle={2}>
                    {catPie.map((_, i) => <Cell key={i} fill={PIE_C[i % PIE_C.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: FONT.ui }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                {catPie.slice(0, 6).map((c, i) => (
                  <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_C[i % PIE_C.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: T.t2, fontFamily: FONT.ui }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono, fontWeight: 700 }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14 }}>Key Business Metrics</div>
          {[
            { label: "Inventory Value (Cost)", value: fmt(invValue), color: T.sky, icon: "📦" },
            { label: "Potential Profit in Stock", value: fmt(potProfit), color: T.emerald, icon: "💰" },
            { label: "Discounts Given", value: fmt(discounts), color: T.crimson, icon: "🏷️" },
            { label: "Avg. Profit per Sale", value: curSales.length ? fmt(profit / curSales.length) : "—", color: T.amber, icon: "📊" },
            { label: "Stock Alerts", value: String(lowProducts.length), color: lowProducts.length > 0 ? T.crimson : T.emerald, icon: "⚠️" },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, color: T.t2, fontFamily: FONT.ui, display: "flex", gap: 7, alignItems: "center" }}><span>{m.icon}</span>{m.label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: m.color, fontFamily: FONT.mono }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dead stock */}
      {prodStats.filter(p => p.sold === 0 && p.stock > 0).length > 0 && (
        <div style={{ background: T.card, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.crimson, marginBottom: 6 }}>💤 Dead Stock ({prodStats.filter(p => p.sold === 0 && p.stock > 0).length} products)</div>
          <div style={{ fontSize: 13, color: T.t3, marginBottom: 14 }}>No sales in the last {days} days. Capital tied up: <span style={{ color: T.crimson, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(prodStats.filter(p => p.sold === 0 && p.stock > 0).reduce((s, p) => s + p.buyPrice * p.stock, 0))}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
            {prodStats.filter(p => p.sold === 0 && p.stock > 0).slice(0, 6).map(p => (
              <div key={p.id} style={{ background: T.crimsonBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontSize: 22 }}>{p.image}</span>
                <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{p.stock} units · <span style={{ color: T.crimson, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(p.buyPrice * p.stock)}</span> stuck</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low stock */}
      {lowProducts.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14 }}>⚠️ Stock Alerts Requiring Action</div>
          {lowProducts.map(p => {
            const st = stockStatus(p); const m = STATUS[st];
            return (
              <div key={p.id} style={{ display: "flex", gap: 14, padding: "10px 14px", background: m.bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${m.color}22`, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>{p.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{p.location} · {p.supplier}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontFamily: FONT.mono }}>{p.stock}</div>
                  <div style={{ fontSize: 10, color: T.t3 }}>/{p.minStock} min</div>
                </div>
                <Badge status={st} />
                <Btn size="sm" variant="sky" onClick={() => onNavigate("inventory")}>📥 Reorder</Btn>
              </div>
            );
          })}
        </div>
      )}

      {/* Workshop + Party Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Workshop Status */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>🔧 Workshop Status</div>
            <Btn size="xs" variant="subtle" onClick={() => onNavigate("workshop")}>View All →</Btn>
          </div>
          {(() => {
            const shopJobs = (jobCards || []).filter(j => j.shopId === activeShopId);
            const active = shopJobs.filter(j => ["in_progress", "approved", "estimated"].includes(j.status));
            const completed = shopJobs.filter(j => j.status === "completed");
            const totalEstimated = active.reduce((s, j) => s + (j.estimatedAmount || 0), 0);
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "rgba(129,140,248,0.1)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#818CF8", fontFamily: FONT.mono }}>{active.length}</div>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>Active</div>
                  </div>
                  <div style={{ background: T.emeraldBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: T.emerald, fontFamily: FONT.mono }}>{completed.length}</div>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>Done</div>
                  </div>
                  <div style={{ background: T.amberGlow, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{fmt(totalEstimated)}</div>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>Pipeline</div>
                  </div>
                </div>
                {active.length > 0 ? active.slice(0, 3).map(j => {
                  const veh = (vehicles || []).find(v => v.id === j.vehicleId);
                  return (
                    <div key={j.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: T.surface, borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                      <span style={{ fontSize: 16 }}>{j.status === "in_progress" ? "🔧" : "📋"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.t1 }}>{j.jobNumber}</div>
                        <div style={{ color: T.t3, fontSize: 11 }}>{veh ? `${veh.make} ${veh.model} · ${veh.registrationNumber}` : "Vehicle"}</div>
                      </div>
                      <span style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{fmt(j.estimatedAmount || 0)}</span>
                    </div>
                  );
                }) : <div style={{ color: T.t3, fontSize: 12, textAlign: "center", padding: 12 }}>No active jobs.</div>}
              </>
            );
          })()}
        </div>

        {/* Party Outstanding Summary */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>👥 Party Outstanding</div>
            <Btn size="xs" variant="subtle" onClick={() => onNavigate("parties")}>View All →</Btn>
          </div>
          {(() => {
            const shopParties = (parties || []).filter(p => p.shopId === activeShopId);
            const customers = shopParties.filter(p => p.type === "customer");
            const suppliers = shopParties.filter(p => p.type === "supplier");
            const custWithCredit = customers.filter(c => {
              const bal = shopMovements.filter(m => m.customerName === c.name && m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
              return bal > 0;
            });
            const totalReceivable = shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
            const totalPayable = shopMovements.filter(m => m.type === "PURCHASE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: T.crimsonBg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Receivable</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.crimson, fontFamily: FONT.mono }}>{fmt(totalReceivable)}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{custWithCredit.length} customers</div>
                  </div>
                  <div style={{ background: `rgba(251,146,60,0.1)`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Payable</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#FB923C", fontFamily: FONT.mono }}>{fmt(totalPayable)}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{suppliers.length} suppliers</div>
                  </div>
                </div>
                {custWithCredit.slice(0, 4).map(c => {
                  const bal = shopMovements.filter(m => m.customerName === c.name && m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
                  return (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.surface, borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: T.t1, fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.crimson }}>{fmt(bal)}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, textAlign: "center", marginTop: 12, padding: "10px 0", borderTop: `1px solid ${T.border}`, color: totalReceivable > totalPayable ? T.crimson : T.emerald }}>
                  Net: {totalReceivable > totalPayable ? "You're owed" : "You owe"} {fmt(Math.abs(totalReceivable - totalPayable))}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14 }}>⚡ Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {[
            { icon: "🧾", label: "New Sale", page: "pos", color: T.amber },
            { icon: "📥", label: "Purchase", page: "inventory", color: T.sky },
            { icon: "🔧", label: "New Job Card", page: "workshop", color: "#818CF8" },
            { icon: "👤", label: "Add Customer", page: "parties", color: T.emerald },
            { icon: "📊", label: "Reports", page: "reports", color: T.amber },
            { icon: "📋", label: "GST Filing", page: "reports", color: T.crimson },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.page)} className="row-hover" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "0.15s", display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: a.color, fontFamily: FONT.ui }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Reminders */}
      {(() => {
        const overdue = getOverduePayments(shopMovements, parties || []);
        if (overdue.length === 0) return null;
        const totalOverdue = overdue.reduce((s, c) => s + c.total, 0);
        return (
          <div style={{ background: T.card, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.crimson }}>📢 Payment Reminders ({overdue.length})</div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Total overdue: <span style={{ color: T.crimson, fontWeight: 800, fontFamily: FONT.mono }}>{fmt(totalOverdue)}</span></div>
              </div>
              <Btn size="xs" variant="subtle" onClick={() => onNavigate("parties")}>View All →</Btn>
            </div>
            {overdue.slice(0, 4).map(c => (
              <div key={c.name} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: T.crimsonBg, borderRadius: 10, marginBottom: 6, border: `1px solid rgba(239,68,68,0.15)` }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{c.invoices.length} invoice{c.invoices.length > 1 ? "s" : ""} · {c.daysOverdue} days overdue</div>
                </div>
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: FONT.mono, color: T.crimson }}>{fmt(c.total)}</span>
                {c.phone && (
                  <button onClick={() => {
                    const msg = generateReminderMessage(c);
                    window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                  }} style={{ background: "#25D366", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    💬 Remind
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Expiring Stock */}
      {(() => {
        const expiring = getExpiringProducts(shopProducts, 60);
        if (expiring.length === 0) return null;
        return (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.amber, marginBottom: 14 }}>⏳ Expiring Stock ({expiring.length} items)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {expiring.slice(0, 6).map(p => (
                <div key={p.id} style={{ background: p.isExpired ? T.crimsonBg : T.amberGlow, border: `1px solid ${p.isExpired ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 10, padding: "12px 14px" }}>
                  <span style={{ fontSize: 20 }}>{p.image}</span>
                  <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: p.isExpired ? T.crimson : T.amber, fontWeight: 800, marginTop: 4 }}>
                    {p.isExpired ? `❌ EXPIRED ${Math.abs(p.daysLeft)}d ago` : `⏰ ${p.daysLeft} days left`}
                  </div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{p.stock} units · Batch: {p.batchNumber || "N/A"}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
