import { useState, useCallback } from "react";
import { T, FONT, GLOBAL_CSS } from "./theme";
import { fmt, uid } from "./utils";
import { useStore } from "./store";
import { Toast, useToast, Btn } from "./components/ui";

// Modals
import { ProductModal } from "./components/ProductModal";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { POSBillingPage } from "./pages/POSBillingPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ReportsPage } from "./pages/ReportsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PartiesPage } from "./pages/PartiesPage";
import { WorkshopPage } from "./pages/WorkshopPage";

// Marketplace
import { MarketplaceHome } from "./marketplace/pages/MarketplaceHome";
import { ProductDetailsPage } from "./marketplace/pages/ProductDetailsPage";
import { CheckoutPage } from "./marketplace/pages/CheckoutPage";
import { OrderTrackingPage } from "./marketplace/pages/OrderTrackingPage";
import { CartDrawer } from "./marketplace/components/CartDrawer";
import { PricingPage } from "./pages/PricingPage";

const NAV_ITEMS = [
  { key: "dashboard", icon: "◈", label: "Dashboard", shortcut: "D" },
  { key: "inventory", icon: "⬡", label: "Inventory", shortcut: "I" },
  { key: "pos", icon: "🧾", label: "POS Billing", shortcut: "P" },
  { key: "parties", icon: "👥", label: "Parties", shortcut: "A" },
  { key: "workshop", icon: "🔧", label: "Workshop", shortcut: "W" },
  { key: "history", icon: "⊞", label: "History", shortcut: "H" },
  { key: "reports", icon: "📊", label: "Reports", shortcut: "R" },
  { key: "orders", icon: "◎", label: "Orders", shortcut: "O" },
];

export default function App() {
  const {
    products, movements, orders, shops, parties, vehicles, jobCards,
    saveProducts, saveMovements, saveOrders, saveParties, saveVehicles, saveJobCards,
    auditLog, receipts, saveReceipts,
    loaded, activeShopId, marketplacePage, setMarketplacePage,
    logAudit, resetAll
  } = useStore();
  const [page, setPage] = useState("dashboard");
  const [pModal, setPModal] = useState({ open: false, product: null });
  const { items: toasts, add: toast, remove: removeToast } = useToast();

  // APP MODE TOGGLE STATE
  const [appMode, setAppMode] = useState("marketplace");
  const [mpPdpId, setMpPdpId] = useState(null);

  const saveProduct = useCallback((p) => {
    const exists = products.find(x => x.id === p.id);
    saveProducts(exists ? products.map(x => x.id === p.id ? p : x) : [...products, p]);
    logAudit(exists ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", "product", p.id, `${p.name} (${p.sku})`);
  }, [products, saveProducts, logAudit]);

  // ========== SINGLE-ITEM SALE HANDLER (legacy, for InventoryPage sale modal) ==========
  const handleSale = useCallback((data) => {
    const isQuote = data.type === "Quotation";
    if (!isQuote) {
      const updated = products.map(p => p.id === data.productId ? { ...p, stock: Math.max(0, p.stock - data.qty) } : p);
      saveProducts(updated);
    }
    const sel = products.find(p => p.id === data.productId);
    const isCredit = data.payments && data.payments.Credit > 0;
    const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, amt]) => amt > 0).map(([k, amt]) => `${k}:${amt}`).join(", ") : data.payment;

    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: isQuote ? "ESTIMATE" : "SALE", qty: data.qty, unitPrice: data.sellPrice, sellingPrice: data.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: isQuote ? 0 : data.profit,
      discount: data.discount, customerName: data.customerName, customerPhone: data.customerPhone,
      vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null, invoiceNo: data.invoiceNo,
      payment: paymentStr, creditDays: 0, paymentStatus: isCredit && !isQuote ? "pending" : "paid",
      note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation generated" : "Walk-in sale"),
      date: data.date,
    }]);

    logAudit(isQuote ? "QUOTATION_CREATED" : "SALE_RECORDED", "movement", data.invoiceNo, `${data.qty}×${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    toast(isQuote ? `Quotation Generated: ${data.invoiceNo}` : `Sale recorded: ${data.qty}×${sel?.name?.slice(0, 20) || "product"} · ${fmt(data.total)}`, isQuote ? "info" : "success", isQuote ? "Estimate Saved" : "Sale Complete");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== MULTI-ITEM SALE HANDLER (new, for POS Billing) ==========
  const handleMultiItemSale = useCallback((data) => {
    const isQuote = data.type === "Quotation";
    const newMovements = [];
    let updatedProducts = [...products];

    // Process each line item
    data.items.forEach(item => {
      if (!isQuote) {
        updatedProducts = updatedProducts.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p);
      }
      const isCredit = data.payments && data.payments.Credit > 0;
      const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, amt]) => amt > 0).map(([k, amt]) => `${k}:${amt}`).join(", ") : "";

      newMovements.push({
        id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
        type: isQuote ? "ESTIMATE" : "SALE", qty: item.qty, unitPrice: item.sellPrice, sellingPrice: item.sellPrice,
        total: item.total, gstAmount: item.gstAmount, profit: isQuote ? 0 : item.profit,
        discount: item.discount, customerName: data.customerName, customerPhone: data.customerPhone,
        vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null,
        invoiceNo: data.invoiceNo, // Same invoice number for all line items!
        payment: paymentStr, creditDays: 0,
        paymentStatus: isCredit && !isQuote ? "pending" : "paid",
        note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation" : "POS Sale"),
        date: data.date,
        multiItemInvoice: true, // Flag to identify multi-item invoices
      });
    });

    saveProducts(updatedProducts);
    saveMovements([...movements, ...newMovements]);

    logAudit(isQuote ? "MULTI_QUOTATION_CREATED" : "MULTI_SALE_RECORDED", "movement", data.invoiceNo, `${data.items.length} items · ${fmt(data.total)}`);
    toast(
      isQuote ? `Quotation: ${data.items.length} items · ${fmt(data.total)}`
        : `Sale recorded: ${data.items.length} items · ${fmt(data.total)}`,
      isQuote ? "info" : "success",
      isQuote ? "Estimate Saved" : `Invoice ${data.invoiceNo}`
    );
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== PURCHASE HANDLER ==========
  const handlePurchase = useCallback((data) => {
    const updated = products.map(p => p.id === data.productId ? {
      ...p, stock: p.stock + data.qty, buyPrice: data.buyPrice,
      sellPrice: data.newSellPrice || p.sellPrice, supplier: data.supplier || p.supplier,
    } : p);
    saveProducts(updated);
    const sel = products.find(p => p.id === data.productId);
    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "", type: "PURCHASE",
      qty: data.qty, unitPrice: data.buyPrice, sellingPrice: data.newSellPrice || sel?.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: null,
      supplier: data.supplier, supplierName: data.supplier, invoiceNo: data.invoiceNo,
      payment: data.payment, paymentMode: data.payment, creditDays: data.creditDays,
      paymentStatus: data.payment === "Credit" ? "pending" : "paid",
      note: [data.supplier && `Supplier: ${data.supplier}`, data.payment === "Credit" && `Credit ${data.creditDays}d`, data.notes].filter(Boolean).join(" · ") || "Stock purchase",
      date: data.date,
    }]);
    logAudit("PURCHASE_RECORDED", "movement", data.invoiceNo, `+${data.qty} ${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    toast(`Stock added: +${data.qty} units · ${fmt(data.total)}`, "info", "Purchase Recorded");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== ADJUSTMENT HANDLER ==========
  const handleAdjustment = useCallback((data) => {
    const sel = products.find(p => p.id === data.productId);
    const stockChange = data.stockDirection * data.qty;
    if (stockChange !== 0) {
      const updated = products.map(p => p.id === data.productId ? { ...p, stock: Math.max(0, p.stock + stockChange) } : p);
      saveProducts(updated);
    }
    const movementType = data.adjustType;
    const lossAmount = (data.adjustType === "DAMAGE" || data.adjustType === "THEFT") ? (sel?.buyPrice || 0) * data.qty : 0;

    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: movementType, qty: data.qty, unitPrice: sel?.buyPrice || 0, sellingPrice: sel?.sellPrice || 0,
      total: data.refundAmount || lossAmount || 0, gstAmount: 0,
      profit: data.adjustType === "RETURN_IN" ? -(data.refundAmount || 0) : data.adjustType === "DAMAGE" || data.adjustType === "THEFT" ? -lossAmount : 0,
      customerName: data.adjustType === "RETURN_IN" ? "Customer Return" : null,
      supplier: data.supplierName || null, supplierName: data.supplierName || null,
      invoiceNo: data.originalInvoice || null,
      payment: data.refundMethod || data.adjustType, paymentStatus: "completed",
      note: [data.reason && `Reason: ${data.reason}`, data.reasonDetail, data.adjustType === "AUDIT" && `Audit: ${data.previousStock} → ${data.previousStock + stockChange}`, data.notes].filter(Boolean).join(" · ") || `Stock ${data.adjustType.toLowerCase()}`,
      date: data.date,
      adjustmentMeta: { type: data.adjustType, previousStock: data.previousStock, newStock: (data.previousStock || 0) + stockChange, reason: data.reason, refundMethod: data.refundMethod },
    }]);

    const labels = { RETURN_IN: "Customer return processed", RETURN_OUT: "Returned to vendor", CREDIT_NOTE: "Credit note issued", DEBIT_NOTE: "Debit note issued", DAMAGE: "Damage recorded", THEFT: "Shrinkage recorded", AUDIT: "Audit correction applied", OPENING: "Opening stock set" };
    logAudit("ADJUSTMENT_" + data.adjustType, "movement", data.productId, `${labels[data.adjustType] || data.adjustType}: ${stockChange > 0 ? "+" : ""}${stockChange} units`);
    toast(`${labels[data.adjustType] || data.adjustType}: ${stockChange !== 0 ? (stockChange > 0 ? "+" : "") + stockChange + " units of " : ""}${sel?.name?.slice(0, 20) || "product"}${data.refundAmount ? " · " + fmt(data.refundAmount) : ""}`, data.adjustType === "RETURN_IN" || data.adjustType === "OPENING" ? "info" : data.adjustType === "CREDIT_NOTE" || data.adjustType === "DEBIT_NOTE" ? "success" : "warning", labels[data.adjustType] || data.adjustType);
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== PAYMENT RECEIPT HANDLER (settle udhaar) ==========
  const handlePaymentReceipt = useCallback((data) => {
    // Create a RECEIPT movement and update related movements
    const receiptMovement = {
      id: "m" + uid(), shopId: activeShopId, productId: null, productName: "",
      type: "RECEIPT", qty: 0, unitPrice: 0, sellingPrice: 0,
      total: data.amount, gstAmount: 0, profit: 0,
      customerName: data.partyName, customerPhone: data.partyPhone,
      payment: data.paymentMode, paymentMode: data.paymentMode, paymentStatus: "paid",
      note: `Payment received: ${fmt(data.amount)} from ${data.partyName} via ${data.paymentMode}. ${data.notes || ""}`.trim(),
      date: Date.now(),
    };

    // Mark pending movements as paid if movementIds provided, otherwise settle by customer name
    let updatedMovements = movements.map(m => {
      if (data.movementIds && data.movementIds.length > 0) {
        if (data.movementIds.includes(m.id)) return { ...m, paymentStatus: "paid" };
      } else if (m.customerName === data.partyName && m.paymentStatus === "pending") {
        return { ...m, paymentStatus: "paid" };
      }
      return m;
    });

    saveMovements([...updatedMovements, receiptMovement]);
    logAudit("RECEIPT_RECORDED", "receipt", data.partyName, `${fmt(data.amount)} via ${data.paymentMode}`);
    toast(`Payment received: ${fmt(data.amount)} from ${data.partyName}`, "success", "Receipt Recorded");
  }, [movements, saveMovements, activeShopId, logAudit, toast]);

  if (!loaded || !products || !movements) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 42, animation: "pulse 1.5s infinite", marginBottom: 16 }}>⚙️</div>
        <div style={{ color: T.t3, fontSize: 14 }}>Loading AutoMobile Space…</div>
      </div>
    </div>
  );

  // ========== MARKETPLACE ROUTING ==========
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

  // ========== SHOP OWNER ERP ==========
  const todaySales = movements.filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= Date.now() - 86400000);
  const todayRev = todaySales.reduce((s, m) => s + m.total, 0);
  const stockSt = p => { if (p.stock <= 0) return "out"; if (p.stock < p.minStock) return "low"; return "ok"; };
  const lowCount = products.filter(p => p.shopId === activeShopId && stockSt(p) !== "ok").length;
  const pendingOrders = (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed")).length;

  const renderPage = () => {
    if (page === "dashboard") return <DashboardPage products={products} movements={movements} orders={orders} activeShopId={activeShopId} onNavigate={setPage} jobCards={jobCards} parties={parties} vehicles={vehicles} />;
    if (page === "inventory") return <InventoryPage products={products} movements={movements} activeShopId={activeShopId} onAdd={() => setPModal({ open: true, product: null })} onEdit={p => setPModal({ open: true, product: p })} onSale={handleSale} onPurchase={handlePurchase} onAdjust={handleAdjustment} toast={toast} />;
    if (page === "pos") return <POSBillingPage products={products} activeShopId={activeShopId} onMultiSale={handleMultiItemSale} toast={toast} />;
    if (page === "history") return <HistoryPage movements={movements} activeShopId={activeShopId} />;
    if (page === "reports") return <ReportsPage movements={movements} products={products} activeShopId={activeShopId} receipts={receipts} saveReceipts={saveReceipts} onPaymentReceipt={handlePaymentReceipt} toast={toast} />;
    if (page === "orders") return <OrdersPage products={products} activeShopId={activeShopId} onSale={handleSale} toast={toast} />;
    if (page === "parties") return <PartiesPage parties={parties} movements={movements} vehicles={vehicles} activeShopId={activeShopId} onSaveParty={(p) => { const exists = (parties || []).find(x => x.id === p.id); saveParties(exists ? parties.map(x => x.id === p.id ? p : x) : [...(parties || []), p]); logAudit(exists ? "PARTY_UPDATED" : "PARTY_CREATED", "party", p.id, p.name); }} onSaveVehicle={(v) => { const exists = (vehicles || []).find(x => x.id === v.id); saveVehicles(exists ? vehicles.map(x => x.id === v.id ? v : x) : [...(vehicles || []), v]); }} toast={toast} />;
    if (page === "workshop") return <WorkshopPage jobCards={jobCards} vehicles={vehicles} parties={parties} products={products} activeShopId={activeShopId} onSaveJobCard={(jc) => { const exists = (jobCards || []).find(x => x.id === jc.id); saveJobCards(exists ? jobCards.map(x => x.id === jc.id ? jc : x) : [...(jobCards || []), jc]); logAudit(exists ? "JOB_CARD_UPDATED" : "JOB_CARD_CREATED", "job_card", jc.id, `${jc.jobNumber} — ${jc.status}`); }} toast={toast} />;
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
              style={{ background: page === n.key ? T.amberGlow : "transparent", color: page === n.key ? T.amber : T.t2, border: `1px solid ${page === n.key ? T.amber + "44" : "transparent"}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7, position: "relative" }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              {n.key === "orders" && pendingOrders > 0 && <span style={{ background: T.crimson, color: "#fff", fontSize: 10, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{pendingOrders}</span>}
              {n.key === "inventory" && lowCount > 0 && <span style={{ background: T.amber, color: "#000", fontSize: 9, borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{lowCount}</span>}
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

        <Btn size="sm" variant="ghost" onClick={() => setPage("pos")} style={{ borderColor: T.border }}>🧾 POS</Btn>
        <Btn size="sm" variant="amber" onClick={() => setPModal({ open: true, product: null })}>＋ Product</Btn>

        {/* Reset button */}
        <button onClick={() => { if (confirm("Reset all data to defaults?")) resetAll(); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: T.t3, cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>🔄</button>

        {/* Avatar */}
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#000", fontWeight: 900, marginLeft: 4 }}>R</div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: "24px 28px", maxWidth: 1440, margin: "0 auto" }}>
        {renderPage()}
      </div>

      {/* MODALS */}
      <ProductModal open={pModal.open} product={pModal.product} activeShopId={activeShopId} onClose={() => setPModal({ open: false, product: null })} onSave={saveProduct} toast={toast} />

      {/* TOASTS */}
      <Toast items={toasts} onRemove={removeToast} />

      {/* MARKETPLACE TOGGLE */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 99999 }}>
        <button onClick={() => setAppMode("marketplace")} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 30, padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 40px rgba(79, 70, 229, 0.4)" }}>
          🔄 Switch to User Marketplace
        </button>
      </div>
    </div>
  );
}
