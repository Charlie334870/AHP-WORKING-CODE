import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate, daysAgo, uid, downloadCSV, generateCSV } from "../utils";
import { Btn, Input, Select, Modal, Field, Divider } from "../components/ui";

export function PartiesPage({ parties, movements, vehicles, activeShopId, onSaveParty, onSaveVehicle, toast }) {
    const [view, setView] = useState("customers");
    const [search, setSearch] = useState("");
    const [editParty, setEditParty] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const shopParties = useMemo(() => (parties || []).filter(p => p.shopId === activeShopId), [parties, activeShopId]);
    const shopVehicles = useMemo(() => (vehicles || []).filter(v => v.shopId === activeShopId), [vehicles, activeShopId]);
    const shopMovements = useMemo(() => (movements || []).filter(m => m.shopId === activeShopId), [movements, activeShopId]);

    const filtered = useMemo(() => {
        const typeFilter = view === "customers" ? "customer" : "supplier";
        return shopParties
            .filter(p => p.type === typeFilter || p.type === "both")
            .filter(p => !search || [p.name, p.phone, p.gstin, p.city].some(s => (s || "").toLowerCase().includes(search.toLowerCase())))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [shopParties, view, search]);

    // Calculate outstanding balance per party from movements
    const getBalance = (party) => {
        let balance = party.openingBalance || 0;
        shopMovements.forEach(m => {
            if (party.type === "customer" || party.type === "both") {
                if (m.customerName === party.name && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) balance += m.total;
                if (m.type === "RECEIPT" && m.customerName === party.name) balance -= m.total;
            }
            if (party.type === "supplier" || party.type === "both") {
                if ((m.supplierName === party.name || m.supplier === party.name) && m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) balance += m.total;
                if (m.type === "PAYMENT" && m.supplierName === party.name) balance -= m.total;
            }
        });
        return balance;
    };

    const getTransactionCount = (party) => {
        return shopMovements.filter(m =>
            m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name
        ).length;
    };

    const totalOutstanding = filtered.reduce((s, p) => s + getBalance(p), 0);

    const stats = {
        total: filtered.length,
        withCredit: filtered.filter(p => getBalance(p) > 0).length,
        totalOutstanding,
    };

    // Party Ledger (transaction list)
    const getPartyLedger = (party) => {
        return shopMovements
            .filter(m => m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name)
            .sort((a, b) => b.date - a.date)
            .slice(0, 20);
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Type", "Phone", "GSTIN", "City", "Credit Limit", "Outstanding", "Transactions", "Tags"];
        const rows = filtered.map(p => [p.name, p.type, p.phone, p.gstin || "", p.city || "", p.creditLimit, getBalance(p), getTransactionCount(p), (p.tags || []).join(", ")]);
        downloadCSV(`${view}_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        toast?.("Party list exported!", "success");
    };

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
                {[["customers", "👤 Customers"], ["suppliers", "🏭 Suppliers"], ["vehicles", "🚗 Vehicles"]].map(([id, label]) => (
                    <button key={id} onClick={() => setView(id)} className="btn-hover-subtle"
                        style={{ background: view === id ? `${T.amber}22` : "transparent", color: view === id ? T.amber : T.t3, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, transition: "0.2s" }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Vehicles Tab */}
            {view === "vehicles" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                        {shopVehicles.map(v => {
                            const owner = shopParties.find(p => p.id === v.ownerId);
                            return (
                                <div key={v.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, transition: "0.2s" }} className="row-hover">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{v.make} {v.model}</div>
                                            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{v.variant} · {v.year} · {v.fuelType}</div>
                                        </div>
                                        <span style={{ background: T.skyBg, color: T.sky, padding: "4px 10px", borderRadius: 6, fontWeight: 800, fontFamily: FONT.mono, fontSize: 13 }}>{v.registrationNumber}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                                        <div><span style={{ color: T.t3 }}>Owner:</span> <span style={{ color: T.t1, fontWeight: 600 }}>{owner?.name || "Unknown"}</span></div>
                                        <div><span style={{ color: T.t3 }}>Engine:</span> <span style={{ color: T.t2 }}>{v.engineType}</span></div>
                                        <div><span style={{ color: T.t3 }}>Odometer:</span> <span style={{ color: T.amber, fontWeight: 700, fontFamily: FONT.mono }}>{(v.odometer || 0).toLocaleString()} km</span></div>
                                        <div><span style={{ color: T.t3 }}>VIN:</span> <span style={{ color: T.t2, fontFamily: FONT.mono, fontSize: 10 }}>{v.vin}</span></div>
                                    </div>
                                    {v.notes && <div style={{ marginTop: 10, padding: "8px 12px", background: `${T.amber}0A`, borderRadius: 8, fontSize: 11, color: T.t3 }}>📝 {v.notes}</div>}
                                </div>
                            );
                        })}
                    </div>
                    {shopVehicles.length === 0 && <div style={{ textAlign: "center", padding: 48, color: T.t3 }}>No vehicles registered. Vehicles are added via Job Cards.</div>}
                </div>
            )}

            {/* Customer/Supplier Tabs */}
            {view !== "vehicles" && (
                <>
                    {/* Stats Bar */}
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 1 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Total {view}</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{stats.total}</div>
                        </div>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 1 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>With Credit</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: T.crimson, fontFamily: FONT.mono }}>{stats.withCredit}</div>
                        </div>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 2 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Total Outstanding</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: totalOutstanding > 0 ? T.crimson : T.emerald, fontFamily: FONT.mono }}>{fmt(totalOutstanding)}</div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1 }}><Input value={search} onChange={setSearch} placeholder={`Search ${view}…`} icon="🔍" /></div>
                        <Btn variant="subtle" size="sm" onClick={handleExportCSV}>📥 Export CSV</Btn>
                        <Btn size="sm" onClick={() => { setEditParty(null); setShowAddModal(true); }}>＋ Add {view === "customers" ? "Customer" : "Supplier"}</Btn>
                    </div>

                    {/* Table */}
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                    {["Name", "Phone", "GSTIN", "City", "Credit Limit", "Outstanding", "Txns", "Tags", ""].map((h, i) => (
                                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", fontFamily: FONT.ui }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: T.t3 }}>No {view} found.</td></tr>
                                ) : filtered.map(p => {
                                    const bal = getBalance(p);
                                    const txns = getTransactionCount(p);
                                    const isExpanded = expandedId === p.id;
                                    return (
                                        <>
                                            <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{p.name}</div>
                                                    {p.email && <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{p.email}</div>}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{p.phone}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: p.gstin ? T.t2 : T.t4 }}>{p.gstin || "—"}</td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2 }}>{p.city || "—"}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{fmt(p.creditLimit)}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, color: bal > 0 ? T.crimson : T.emerald }}>{bal > 0 ? fmt(bal) : "—"}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{txns}</td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                        {(p.tags || []).map(t => (
                                                            <span key={t} style={{ background: `${T.amber}14`, color: T.amber, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{t}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <Btn size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setEditParty(p); setShowAddModal(true); }}>Edit</Btn>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={p.id + "_detail"}>
                                                    <td colSpan={9} style={{ padding: "0 14px 14px 14px", background: T.surface }}>
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: T.t1, marginBottom: 8, marginTop: 8 }}>Recent Transactions</div>
                                                        {getPartyLedger(p).length === 0 ? (
                                                            <div style={{ color: T.t3, fontSize: 12 }}>No transactions yet.</div>
                                                        ) : (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                {getPartyLedger(p).map(m => (
                                                                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: T.card, borderRadius: 6, fontSize: 11 }}>
                                                                        <span style={{ color: T.t3 }}>{fmtDate(m.date)} · {m.type}</span>
                                                                        <span style={{ color: T.t2 }}>{m.productName}</span>
                                                                        <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: m.type === "SALE" || m.type === "PURCHASE" ? T.amber : T.emerald }}>{fmt(m.total)}</span>
                                                                        <span style={{ color: m.paymentStatus === "paid" ? T.emerald : T.crimson, fontWeight: 600, fontSize: 10 }}>{m.paymentStatus}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {p.notes && <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.amber}08`, borderRadius: 6, fontSize: 11, color: T.t3 }}>📝 {p.notes}</div>}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Add/Edit Party Modal */}
            <PartyFormModal
                open={showAddModal}
                party={editParty}
                type={view === "customers" ? "customer" : "supplier"}
                onClose={() => { setShowAddModal(false); setEditParty(null); }}
                onSave={(p) => {
                    onSaveParty?.(p);
                    toast?.(editParty ? `${p.name} updated!` : `${p.name} added!`, "success");
                    setShowAddModal(false);
                    setEditParty(null);
                }}
                activeShopId={activeShopId}
            />
        </div>
    );
}

// ===== Party Form Modal =====
function PartyFormModal({ open, party, type, onClose, onSave, activeShopId }) {
    const isEdit = !!party;
    const blank = { name: "", phone: "", email: "", gstin: "", address: "", city: "", creditLimit: "0", creditDays: "30", loyaltyPoints: "0", openingBalance: "0", tags: "", notes: "" };
    const [f, setF] = useState(blank);

    useEffect(() => {
        if (party) {
            setF({ ...party, creditLimit: String(party.creditLimit || 0), creditDays: String(party.creditDays || 30), loyaltyPoints: String(party.loyaltyPoints || 0), openingBalance: String(party.openingBalance || 0), tags: (party.tags || []).join(", ") });
        } else {
            setF(blank);
        }
    }, [party, open]);

    const set = k => v => setF(p => ({ ...p, [k]: v }));

    const handleSave = () => {
        if (!f.name.trim()) return;
        onSave({
            ...f,
            id: party?.id || (type === "customer" ? "cust" : "sup") + "_" + uid(),
            shopId: party?.shopId || activeShopId,
            type: party?.type || type,
            creditLimit: +f.creditLimit || 0,
            creditDays: +f.creditDays || 30,
            loyaltyPoints: +f.loyaltyPoints || 0,
            openingBalance: +f.openingBalance || 0,
            tags: f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            vehicles: party?.vehicles || [],
            isActive: true,
            createdAt: party?.createdAt || Date.now(),
        });
    };

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${type === "customer" ? "Customer" : "Supplier"}` : `Add ${type === "customer" ? "Customer" : "Supplier"}`} width={560}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "span 2" }}><Field label="Name" required><Input value={f.name} onChange={set("name")} placeholder="Business or person name" /></Field></div>
                <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="+91 9876543210" /></Field>
                <Field label="Email"><Input value={f.email} onChange={set("email")} placeholder="email@example.com" /></Field>
                <Field label="GSTIN"><Input value={f.gstin} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" /></Field>
                <Field label="City"><Input value={f.city} onChange={set("city")} placeholder="Hyderabad" /></Field>
                <div style={{ gridColumn: "span 2" }}><Field label="Address"><Input value={f.address} onChange={set("address")} placeholder="Full address" /></Field></div>
                <Divider label="Credit & Finance" />
                <div style={{ gridColumn: "span 2" }} />
                <Field label="Credit Limit (₹)"><Input type="number" value={f.creditLimit} onChange={set("creditLimit")} prefix="₹" /></Field>
                <Field label="Credit Days"><Input type="number" value={f.creditDays} onChange={set("creditDays")} suffix="days" /></Field>
                <Field label="Opening Balance (₹)"><Input type="number" value={f.openingBalance} onChange={set("openingBalance")} prefix="₹" /></Field>
                {type === "customer" && <Field label="Loyalty Points"><Input type="number" value={f.loyaltyPoints} onChange={set("loyaltyPoints")} /></Field>}
                <div style={{ gridColumn: "span 2" }}><Field label="Tags (comma-separated)"><Input value={f.tags} onChange={set("tags")} placeholder="regular, mechanic, credit" /></Field></div>
                <div style={{ gridColumn: "span 2" }}><Field label="Notes"><Input value={f.notes} onChange={set("notes")} placeholder="Internal notes" /></Field></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant="amber" onClick={handleSave}>💾 {isEdit ? "Save Changes" : `Add ${type === "customer" ? "Customer" : "Supplier"}`}</Btn>
            </div>
        </Modal>
    );
}
