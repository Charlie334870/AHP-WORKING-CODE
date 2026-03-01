import { useState, useCallback } from "react";
import { T, FONT, GLOBAL_CSS } from "./theme";
import { fmt } from "./utils";
import { useStore } from "./store";
import { Toast, useToast, Btn } from "./components/ui";

// Modals
import { ProductModal } from "./components/ProductModal";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ReportsPage } from "./pages/ReportsPage";

// NEW USER MARKETPLACE ENTRY POINT
import { MarketplaceHome } from "./marketplace/pages/MarketplaceHome";
import { ProductDetailsPage } from "./marketplace/pages/ProductDetailsPage";
import { CheckoutPage } from "./marketplace/pages/CheckoutPage";
import { OrderTrackingPage } from "./marketplace/pages/OrderTrackingPage";
import { CartDrawer } from "./marketplace/components/CartDrawer";
import { PricingPage } from "./pages/PricingPage";

const NAV_ITEMS = [
  { key: "dashboard", icon: "◈", label: "Dashboard" },
  { key: "inventory", icon: "⬡", label: "Inventory" },
  { key: "history", icon: "⊞", label: "History" },
  { key: "reports", icon: "📊", label: "Reports" },
  { key: "orders", icon: "◎", label: "Orders" },
];

export default function App() {
  const { products, movements, orders, saveProducts, saveMovements, saveOrders, loaded, activeShopId, marketplacePage, setMarketplacePage } = useStore();
  const [page, setPage] = useState("dashboard");
  const [pModal, setPModal] = useState({ open: false, product: null });
  const { items: toasts, add: toast, remove: removeToast } = useToast();

  // APP MODE TOGGLE STATE
  const [appMode, setAppMode] = useState("marketplace"); // 'marketplace' or 'shopOwner'
  const [mpPdpId, setMpPdpId] = useState(null);

  const saveProduct = useCallback((p) => {
    const exists = products.find(x => x.id === p.id);
    saveProducts(exists ? products.map(x => x.id === p.id ? p : x) : [...products, p]);
  }, [products, saveProducts]);

  const handleSale = useCallback((data) => {
    // 1. Differentiate between Sale and Quotation
    const isQuote = data.type === "Quotation";

    if (!isQuote) {
      // Deduct stock only for actual Sales
      const updated = products.map(p => p.id === data.productId ? { ...p, stock: Math.max(0, p.stock - data.qty) } : p);
      saveProducts(updated);
    }

    const sel = products.find(p => p.id === data.productId);
    const uid = () => Math.random().toString(36).slice(2, 10);

    // 2. Format Multi-Tender Payments
    const isCredit = data.payments && data.payments.Credit > 0;
    const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, amt]) => amt > 0).map(([k, amt]) => `${k}:${amt}`).join(", ") : data.payment;

    saveMovements([...movements, {
      id: "m" + uid(),
      shopId: activeShopId,
      productId: data.productId,
      productName: sel?.name || "",
      type: isQuote ? "ESTIMATE" : "SALE",
      qty: data.qty,
      unitPrice: data.sellPrice,
      sellingPrice: data.sellPrice,
      total: data.total,
      gstAmount: data.gstAmount,
      profit: isQuote ? 0 : data.profit,
      discount: data.discount,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      vehicleReg: data.vehicleReg,
      mechanic: data.mechanic,
      supplier: null,
      invoiceNo: data.invoiceNo,
      payment: paymentStr,
      creditDays: 0,
      paymentStatus: isCredit && !isQuote ? "pending" : "paid",
      note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation generated" : "Walk-in sale"),
      date: data.date,
    }]);

    toast(isQuote ? `Quotation Generated: ${data.invoiceNo}` : `Sale recorded: ${data.qty}×${sel?.name?.slice(0, 20) || "product"} · ${fmt(data.total)}`, isQuote ? "info" : "success", isQuote ? "Estimate Saved" : "Sale Complete");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId]);

  const handlePurchase = useCallback((data) => {
    const updated = products.map(p => p.id === data.productId ? {
      ...p,
      stock: p.stock + data.qty,
      buyPrice: data.buyPrice,
      sellPrice: data.newSellPrice || p.sellPrice,
      supplier: data.supplier || p.supplier,
    } : p);
    saveProducts(updated);
    const sel = products.find(p => p.id === data.productId);
    const uid = () => Math.random().toString(36).slice(2, 10);
    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "", type: "PURCHASE",
      qty: data.qty, unitPrice: data.buyPrice, sellingPrice: data.newSellPrice || sel?.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: null,
      supplier: data.supplier, invoiceNo: data.invoiceNo,
      payment: data.payment, creditDays: data.creditDays,
      paymentStatus: data.payment === "Credit" ? "pending" : "paid",
      note: [data.supplier && `Supplier: ${data.supplier}`, data.payment === "Credit" && `Credit ${data.creditDays}d`, data.notes].filter(Boolean).join(" · ") || "Stock purchase",
      date: data.date,
    }]);
    toast(`Stock added: +${data.qty} units · ${fmt(data.total)}`, "info", "Purchase Recorded");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId]);

  if (!loaded || !products || !movements) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 42, animation: "pulse 1.5s infinite", marginBottom: 16 }}>⚙️</div>
        <div style={{ color: T.t3, fontSize: 14 }}>Loading Velvet System…</div>
      </div>
    </div>
  );

  // ROUTING RENDER LOGIC
  // ----------------------------------------------------
  if (appMode === "marketplace") {
    const mpPage = marketplacePage;
    const setMpPage = setMarketplacePage;
    const renderMpPage = () => {
      if (mpPage === "pdp" && mpPdpId) return <ProductDetailsPage productId={mpPdpId} onBack={() => setMpPage("home")} />;
      if (mpPage === "checkout") return <CheckoutPage onBack={() => setMpPage("home")} onOrderPlaced={() => setMpPage("tracking")} />;
      if (mpPage === "tracking") return <OrderTrackingPage onBack={() => setMpPage("home")} />;
      if (mpPage === "pricing") return <PricingPage onBack={() => setMpPage("home")} />;
      return <MarketplaceHome />;
    };

    return (
      <>
        {renderMpPage()}
        <CartDrawer />
        {/* Nav Floating Buttons */}
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 99999, display: "flex", flexDirection: "column", gap: 10 }}>
          {mpPage !== "tracking" && <button onClick={() => setMpPage("tracking")} style={{ background: T.card, border: `1px solid ${T.border}`, color: T.t2, borderRadius: 30, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>📦 My Orders</button>}
          {mpPage !== "pricing" && <button onClick={() => setMpPage("pricing")} style={{ background: T.card, border: `1px solid ${T.amber}44`, color: T.amber, borderRadius: 30, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>💎 Pricing</button>}
          <button onClick={() => setAppMode("shopOwner")} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 30, padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 40px rgba(79, 70, 229, 0.4)" }}>
            🔄 Switch to Shop Owner View
          </button>
        </div>
      </>
    );
  }

  // SHOP OWNER DASHBOARD RENDER LOGIC
  const todaySales = movements.filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= Date.now() - 86400000);
  const todayRev = todaySales.reduce((s, m) => s + m.total, 0);

  const stockStatus = p => {
    if (p.stock <= 0) return "out";
    if (p.stock < p.minStock) return "low";
    return "ok";
  };
  const lowCount = products.filter(p => p.shopId === activeShopId && stockStatus(p) !== "ok").length;

  const renderPage = () => {
    if (page === "dashboard") return <DashboardPage products={products} movements={movements} orders={orders} activeShopId={activeShopId} onNavigate={setPage} />;
    if (page === "inventory") return <InventoryPage products={products} movements={movements} activeShopId={activeShopId} onAdd={() => setPModal({ open: true, product: null })} onEdit={p => setPModal({ open: true, product: p })} onSale={handleSale} onPurchase={handlePurchase} toast={toast} />;
    if (page === "history") return <HistoryPage movements={movements} activeShopId={activeShopId} />;
    if (page === "reports") return <ReportsPage movements={movements} activeShopId={activeShopId} />;
    if (page === "orders") return <OrdersPage products={products} activeShopId={activeShopId} onSale={handleSale} toast={toast} />;
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, color: T.t1 }}>
      <style>{GLOBAL_CSS}</style>

      {/* TOPBAR */}
      <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 20px", position: "sticky", top: 0, zIndex: 500, gap: 10 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#000", boxShadow: `0 2px 12px ${T.amber}55`, letterSpacing: "-0.05em" }}>R</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, letterSpacing: "-0.02em" }}>Ravi Auto Parts</div>
            <div style={{ fontSize: 10, color: T.amber, fontWeight: 600, letterSpacing: "0.04em" }}>INVENTORY · HYDERABAD</div>
          </div>
        </div>

        {/* NAV */}
        <div style={{ display: "flex", gap: 2 }}>
          {NAV_ITEMS.map(n => (
            <button key={n.key} className={`nav-item${page === n.key ? " nav-active" : ""}`} onClick={() => setPage(n.key)}
              style={{ background: page === n.key ? T.amberGlow : "transparent", color: page === n.key ? T.amber : T.t2, border: `1px solid ${page === n.key ? T.amber + "44" : "transparent"}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              {n.key === "orders" && <span style={{ background: T.crimson, color: "#fff", fontSize: 10, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>2</span>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Quick stats */}
        {todayRev > 0 && (
          <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.emerald, fontWeight: 700, fontFamily: FONT.mono, display: "flex", alignItems: "center", gap: 6 }}>
            📈 Today: {fmt(todayRev)}
          </div>
        )}
        {lowCount > 0 && (
          <button onClick={() => setPage("inventory")} style={{ background: T.crimsonBg, border: `1px solid ${T.crimson}33`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.crimson, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5 }}>
            ⚠ {lowCount} alert{lowCount > 1 ? "s" : ""}
          </button>
        )}

        <Btn size="sm" variant="ghost" onClick={() => { setPage("inventory"); }} style={{ borderColor: T.border }}>📤 Sale</Btn>
        <Btn size="sm" variant="amber" onClick={() => setPModal({ open: true, product: null })}>＋ Product</Btn>

        {/* Avatar */}
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#000", fontWeight: 900, marginLeft: 4 }}>R</div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: "24px 28px", maxWidth: 1440, margin: "0 auto" }}>
        {renderPage()}
      </div>

      {/* MODALS */}
      <ProductModal
        open={pModal.open} product={pModal.product}
        onClose={() => setPModal({ open: false, product: null })}
        onSave={saveProduct} toast={toast}
      />

      {/* TOASTS */}
      <Toast items={toasts} onRemove={removeToast} />

      {/* DEV SYSTEM TOGGLE FLOATING BUTTON */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 99999 }}>
        <button onClick={() => setAppMode("marketplace")} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 30, padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 40px rgba(79, 70, 229, 0.4)" }}>
          🔄 Switch to User Marketplace
        </button>
      </div>

    </div>
  );
}
