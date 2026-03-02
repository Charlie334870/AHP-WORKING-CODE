import { useState, useEffect, useRef } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDateTime } from "../utils";
import { Modal, Field, Input, Select, Divider, Btn } from "./ui";

export function SaleModal({ open, onClose, product, products, onSave, toast }) {
    const blank = {
        type: "Sale", // "Sale" | "Quotation"
        productId: product?.id || "",
        qty: "1",
        sellPrice: String(product?.sellPrice || ""),
        discount: "0",
        discountType: "%",
        customerName: "",
        customerPhone: "",
        vehicleReg: "",
        mechanic: "",
        paymentModes: { Cash: 0, UPI: 0, Card: 0, Credit: 0, Cheque: 0 },
        notes: ""
    };
    const [f, setF] = useState(blank);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const now = useRef(Date.now());
    useEffect(() => { now.current = Date.now(); }, [open]);

    useEffect(() => {
        if (open) setF({ ...blank, productId: product?.id || "", sellPrice: String(product?.sellPrice || "") });
        setErrors({});
        setShowInvoice(false);
    }, [open, product]);

    const set = k => v => setF(p => ({ ...p, [k]: v }));
    const sel = products?.find(p => p.id === f.productId) || product;

    const qty = +f.qty || 0;
    const sellPrice = +f.sellPrice || (sel?.sellPrice || 0);
    const discAmt = f.discountType === "%"
        ? sellPrice * qty * (+f.discount || 0) / 100
        : +f.discount || 0;
    const subtotal = sellPrice * qty;
    const totalAfterDisc = subtotal - discAmt;
    const gstRate = sel?.gstRate || sel?.gst || 18;
    const gstAmt_ = (totalAfterDisc * gstRate) / (100 + gstRate); // GST inclusive
    const profitPerUnit = sellPrice - (sel?.buyPrice || 0);
    const totalProfit = (profitPerUnit * qty) - discAmt;
    const invoiceRef = useRef("");
    if (!invoiceRef.current || !open) invoiceRef.current = (f.type === "Quotation" ? "EST-" : "INV-") + Math.floor(Math.random() * 9000 + 4000);
    const invoiceNo = invoiceRef.current;

    // Payment Splitting Logic
    const activePayments = Object.values(f.paymentModes).reduce((a, b) => a + b, 0);
    const autoCredit = Math.max(0, totalAfterDisc - activePayments); // Whatever is unpaid drops to credit

    const validate = () => {
        const e = {};
        if (!f.productId) e.productId = "Select a product";
        if (!f.qty || +f.qty <= 0) e.qty = "Enter quantity";
        if (f.type === "Sale" && sel && +f.qty > sel.stock) e.qty = `Only ${sel.stock} in stock`;
        if (!f.sellPrice || +f.sellPrice <= 0) e.sellPrice = "Enter price";
        if (activePayments > totalAfterDisc + 1) e.payments = "Payment exceeds total bill";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 300));

        // Finalize payment distribution
        const finalPayments = { ...f.paymentModes };
        if (autoCredit > 0) finalPayments.Credit += autoCredit;

        onSave({
            type: f.type, // Sale or Estimate
            productId: f.productId,
            qty: +f.qty,
            sellPrice,
            discount: discAmt,
            discountType: f.discountType,
            discountValue: +f.discount || 0,
            subtotal,
            total: totalAfterDisc,
            gstAmount: f.type === "Sale" ? gstAmt_ : 0,
            profit: totalProfit,
            customerName: f.customerName,
            customerPhone: f.customerPhone,
            vehicleReg: f.vehicleReg,
            mechanic: f.mechanic,
            payments: finalPayments,
            notes: f.notes,
            invoiceNo,
            date: now.current,
        });
        setSaving(false);
        setShowInvoice(true);
    };

    const paymentModesList = ["Cash", "UPI", "Card", "Credit", "Cheque"];

    if (showInvoice && sel) return (
        <Modal open={open} onClose={onClose} title="Sale Recorded ✓" width={440}>
            <div style={{ background: T.emeraldBg, border: `1px solid rgba(16,185,129,0.25)`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>✓</span>
                <div><div style={{ fontWeight: 700, color: T.emerald }}>Sale recorded successfully</div><div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{qty} × {sel.name.slice(0, 30)} · {fmt(totalAfterDisc)}</div></div>
            </div>
            {/* Mini Invoice */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", fontSize: 13, fontFamily: FONT.ui }}>
                <div style={{ textAlign: "center", paddingBottom: 12, borderBottom: `1px dashed ${T.border}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>RAVI AUTO PARTS</div>
                    <div style={{ fontSize: 12, color: T.t3 }}>Hyderabad · GST: 36AAXXX1234X1Z5</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{invoiceNo} · {fmtDateTime(now.current)}</div>
                </div>
                {f.customerName && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: T.t3 }}>Customer</span><span style={{ fontWeight: 600 }}>{f.customerName}</span></div>}
                {f.vehicleReg && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: T.t3 }}>Vehicle</span><span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{f.vehicleReg}</span></div>}
                <div style={{ background: T.card, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: T.t2, fontSize: 13 }}>{sel.name.slice(0, 30)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3 }}>
                        <span>{qty} × {fmt(sellPrice)}</span>
                        <span style={{ color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(subtotal)}</span>
                    </div>
                    {discAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.crimson, marginTop: 4 }}><span>Discount</span><span>−{fmt(discAmt)}</span></div>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 10, color: T.t1 }}>
                    <span>TOTAL</span><span style={{ fontFamily: FONT.mono }}>{fmt(totalAfterDisc)}</span>
                </div>
                {Object.entries({ ...f.paymentModes, Credit: f.paymentModes.Credit + autoCredit }).filter(([_, amt]) => amt > 0).map(([method, amt]) => (
                    <div key={method} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginTop: 4 }}>
                        <span>Paid via {method}</span><span style={{ fontFamily: FONT.mono }}>{fmt(amt)}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn variant="ghost" full style={{ fontSize: 12 }} onClick={() => window.print()}>🖨 Print</Btn>
                <Btn variant="ghost" full style={{ fontSize: 12 }} onClick={() => {
                    const msg = encodeURIComponent(`📋 ${f.type === "Quotation" ? "Quotation" : "Invoice"} ${invoiceNo}\n\nProduct: ${sel.name}\nQty: ${qty} × ${fmt(sellPrice)} = ${fmt(totalAfterDisc)}${discAmt > 0 ? `\nDiscount: -${fmt(discAmt)}` : ""}\n\nThank you for your business!\n— Ravi Auto Parts, Hyderabad`);
                    const phone = f.customerPhone ? f.customerPhone.replace(/\D/g, "") : "";
                    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                }}>💬 WhatsApp</Btn>
                <Btn variant="amber" full onClick={onClose}>Done</Btn>
            </div>
        </Modal>
    );

    return (
        <Modal open={open} onClose={onClose} title={`📤 ${f.type} Entry`} subtitle={f.type === "Sale" ? "Record a product sold to customer" : "Generate a price quotation (does not deduct stock)"} width={620}>

            {/* TYPE TOGGLE */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, background: T.surface, padding: 6, borderRadius: 10 }}>
                {["Sale", "Quotation"].map(t => (
                    <button key={t} onClick={() => set("type")(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: f.type === t ? (t === "Sale" ? T.amber : T.sky) : "transparent", color: f.type === t ? "#000" : T.t3, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
                        {t === "Sale" ? "🧾 Tax Invoice / Cash Memo" : "📝 Estimate / Quotation"}
                    </button>
                ))}
            </div>

            {!product && (
                <div style={{ marginBottom: 18 }}>
                    <Field label="Product" required error={errors.productId}>
                        <Select value={f.productId} onChange={v => {
                            const p = products?.find(x => x.id === v);
                            setF(prev => ({ ...prev, productId: v, sellPrice: String(p?.sellPrice || "") }));
                        }} options={[{ value: "", label: "— Select product —" }, ...(products || []).map(p => ({ value: p.id, label: `${p.image} ${p.name} (Stock: ${p.stock})` }))]} />
                    </Field>
                </div>
            )}

            {sel && (
                <div style={{ background: T.amberGlow, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 32 }}>{sel.image}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{sel.name}</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{sel.sku} · {sel.vehicles || (sel.compatibleVehicles || []).join(", ") || "Universal"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: T.t3 }}>Stock</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: sel.stock < sel.minStock ? T.crimson : T.t1, fontFamily: FONT.mono }}>{sel.stock}</div>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Quantity" required error={errors.qty} hint={f.type === "Sale" && sel ? `Available: ${sel.stock} units` : ""}>
                    <Input type="number" value={f.qty} onChange={set("qty")} placeholder="1" suffix="units" autoFocus={!!product} />
                </Field>
                <Field label="Selling Price / Unit" required error={errors.sellPrice} hint={sel ? `Default: ${fmt(sel.sellPrice)}` : ""}>
                    <Input type="number" value={f.sellPrice} onChange={set("sellPrice")} placeholder={String(sel?.sellPrice || "")} prefix="₹" />
                </Field>

                {/* Discount */}
                <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                    <Field label="Discount Type">
                        <Select value={f.discountType} onChange={set("discountType")} options={[{ value: "%", label: "Percent (%)" }, { value: "flat", label: "Flat Amount (₹)" }]} />
                    </Field>
                    <Field label={`Discount ${f.discountType === "%" ? "%" : "₹ Amount"}`} hint={discAmt > 0 ? `= ${fmt(discAmt)} off` : ""}>
                        <Input type="number" value={f.discount} onChange={set("discount")} placeholder="0" prefix={f.discountType === "flat" ? "₹" : undefined} suffix={f.discountType === "%" ? "%" : undefined} />
                    </Field>
                </div>

                <Divider label="Customer Details" />
                <div style={{ gridColumn: "span 2" }} />

                <Field label="Customer / Garage Name">
                    <Input value={f.customerName} onChange={set("customerName")} placeholder="Raj Garage, Walk-in…" icon="👤" />
                </Field>
                <Field label="Phone Number">
                    <Input value={f.customerPhone} onChange={set("customerPhone")} placeholder="+91 98765 43210" icon="📞" />
                </Field>
                <Field label="Vehicle Registration" hint="For warranty / reference">
                    <Input value={f.vehicleReg} onChange={set("vehicleReg")} placeholder="MH 02 AB 1234" icon="🚗" />
                </Field>
                <Field label="Mechanic / Technician">
                    <Input value={f.mechanic} onChange={set("mechanic")} placeholder="Ramesh K" icon="🔧" />
                </Field>

                <Divider label="Payment Splitting (Udhaar)" />
                <div style={{ gridColumn: "span 2" }} />

                <div style={{ gridColumn: "span 2" }}>
                    <Field label="How is the customer paying today?" error={errors.payments}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
                            {["Cash", "UPI", "Card"].map(pm => (
                                <div key={pm} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>{pm === "Cash" ? "💵" : pm === "UPI" ? "📱" : "💳"} {pm}</span>
                                    <input
                                        type="number"
                                        value={f.paymentModes[pm] || ""}
                                        onChange={e => setF(p => ({ ...p, paymentModes: { ...p.paymentModes, [pm]: +e.target.value } }))}
                                        placeholder="0"
                                        style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 4, padding: "4px 8px", fontFamily: FONT.mono, fontSize: 14, textAlign: "right" }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ background: autoCredit > 0 ? `${T.crimson}22` : T.surface, border: `1px solid ${autoCredit > 0 ? T.crimson : T.border}`, padding: "10px 14px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: autoCredit > 0 ? T.crimson : T.t2 }}>📋 Unpaid Balance (Udhaar)</div>
                                <div style={{ fontSize: 11, color: T.t3 }}>Auto-calculated to credit ledger</div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, color: autoCredit > 0 ? T.crimson : T.t3 }}>{fmt(autoCredit)}</div>
                        </div>
                    </Field>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Notes"><Input value={f.notes} onChange={set("notes")} placeholder="e.g. Regular customer, warranty given" /></Field>
                </div>

                {/* LIVE BILL PREVIEW */}
                {qty > 0 && sellPrice > 0 && (
                    <>
                        <Divider label="Bill Preview" />
                        <div style={{ gridColumn: "span 2", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, color: T.t3 }}>Subtotal</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{fmt(subtotal)}</span>
                                    </div>
                                    {discAmt > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span style={{ fontSize: 13, color: T.crimson }}>Discount</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: T.crimson, fontFamily: FONT.mono }}>−{fmt(discAmt)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, color: T.t3 }}>GST ({sel?.gst || 18}%, incl.)</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: T.amber, fontFamily: FONT.mono }}>{fmt(gstAmt_)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>TOTAL</span>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: T.sky, fontFamily: FONT.mono }}>{fmt(totalAfterDisc)}</span>
                                    </div>
                                </div>
                                <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}>
                                    <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Profit Analysis</div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: 11, color: T.t3 }}>Cost price × {qty}</div>
                                        <div style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.t2 }}>−{fmt((sel?.buyPrice || 0) * qty)}</div>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: 11, color: T.t3 }}>Discount given</div>
                                        <div style={{ fontFamily: FONT.mono, fontWeight: 700, color: discAmt > 0 ? T.crimson : T.t3 }}>{discAmt > 0 ? `−${fmt(discAmt)}` : "—"}</div>
                                    </div>
                                    <div style={{ paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                                        <div style={{ fontSize: 11, color: T.t3 }}>Net profit</div>
                                        <div style={{ fontSize: 20, fontWeight: 900, fontFamily: FONT.mono, color: totalProfit >= 0 ? T.emerald : T.crimson }}>{totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant={f.type === "Sale" ? "amber" : "sky"} loading={saving} onClick={handleSave}>
                    {f.type === "Sale" ? "📤 Record Sale & Generate Bill" : "📝 Save Quotation"}
                </Btn>
            </div>
        </Modal>
    );
}
