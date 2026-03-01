import { T } from './theme';

export const CATEGORIES = ["Engine", "Brakes", "Electrical", "Suspension", "Filters", "Cooling", "Body", "Tyres", "Lubrication", "Transmission", "Clutch", "Steering"];
export const EMOJIS = ["🔧", "⚙️", "🔩", "🛢️", "⚡", "🔋", "🌀", "💧", "📯", "🔌", "🔑", "🛞", "🪛", "🔦", "📦", "🏷️", "🪝", "⛽", "🧴", "🔴", "🔵", "⬛"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const SEED_SHOPS = [
    { id: "s1", name: "Ravi Auto Parts", ownerName: "Ravi K", phone: "+91 9876543210", address: "14/A, Jubilee Hills", city: "Hyderabad", pincode: "500033", rating: 4.8, totalOrders: 1420, imageEmoji: "🏭", createdAt: Date.now() - 365 * 86400000, isActive: true },
    { id: "s2", name: "Sri Durga Auto", ownerName: "Ramesh P", phone: "+91 9876543211", address: "Shop 2, Ameerpet", city: "Hyderabad", pincode: "500016", rating: 4.5, totalOrders: 850, imageEmoji: "🔧", createdAt: Date.now() - 200 * 86400000, isActive: true },
    { id: "s3", name: "National Spares", ownerName: "Mohammed A", phone: "+91 9876543212", address: "Afzal Gunj", city: "Hyderabad", pincode: "500012", rating: 4.9, totalOrders: 3200, imageEmoji: "⚙️", createdAt: Date.now() - 500 * 86400000, isActive: true }
];

export const SEED_PRODUCTS = [
    // Shop 1 (Ravi Auto Parts - Current Default)
    { id: "p1", shopId: "s1", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1200, sellPrice: 1850, mrp: 2200, gstRate: 18, stock: 24, reservedStock: 0, minStock: 10, location: "Rack A-12", unit: "set", image: "🔧", description: "Premium ceramic brake pads. Fits 2015-2023 models.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p2", shopId: "s1", name: "Denso O2 Sensor Universal", sku: "ELC-O2-117", category: "Electrical", brand: "Denso", compatibleVehicles: ["Universal"], buyPrice: 890, sellPrice: 1400, mrp: 1800, gstRate: 18, stock: 6, reservedStock: 0, minStock: 8, location: "Rack B-04", unit: "pcs", image: "⚡", description: "Universal oxygen sensor.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p3", shopId: "s1", name: "Mahle Oil Filter", sku: "ENG-OF-147", category: "Filters", brand: "Mahle", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai Creta"], buyPrice: 180, sellPrice: 320, mrp: 450, gstRate: 18, stock: 82, reservedStock: 0, minStock: 20, location: "Rack C-01", unit: "pcs", image: "🛢️", description: "High flow oil filter.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p5", shopId: "s1", name: "Monroe Front Shock Absorber", sku: "SUS-SA-M220", category: "Suspension", brand: "Monroe", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Dzire", "Maruti Suzuki Wagon R"], buyPrice: 2400, sellPrice: 3600, mrp: 4800, gstRate: 28, stock: 11, reservedStock: 0, minStock: 5, location: "Rack D-15", unit: "pcs", image: "🔩", description: "Gas-charged shock absorber.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },

    // Shop 2 (Sri Durga) - Competitor
    { id: "p4", shopId: "s2", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1150, sellPrice: 1790, mrp: 2200, gstRate: 18, stock: 15, reservedStock: 0, minStock: 5, location: "Gdn-Front", unit: "set", image: "🔧", description: "Premium ceramic brake pads.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p6", shopId: "s2", name: "NGK Spark Plug BKR6E", sku: "ENG-SP-BKR", category: "Engine", brand: "NGK", compatibleVehicles: ["Honda City", "Maruti Suzuki Swift"], buyPrice: 95, sellPrice: 165, mrp: 200, gstRate: 18, stock: 45, reservedStock: 0, minStock: 25, location: "Box-2", unit: "pcs", image: "⚙️", description: "Copper core spark plug.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },

    // Shop 3 (National Spares) - Competitor
    { id: "p7", shopId: "s3", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1100, sellPrice: 1900, mrp: 2200, gstRate: 18, stock: 50, reservedStock: 0, minStock: 20, location: "Aisle 4", unit: "set", image: "🔧", description: "Premium ceramic brake pads.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p8", shopId: "s3", name: "Exide FFS0-EP44L Battery", sku: "ELC-BAT-EX", category: "Electrical", brand: "Exide", compatibleVehicles: ["Universal"], buyPrice: 4200, sellPrice: 5800, mrp: 6500, gstRate: 28, stock: 12, reservedStock: 0, minStock: 4, location: "Floor", unit: "pcs", image: "🔋", description: "Maintenance free battery 44Ah.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
];

export const genSeededMovements = () => {
    const now = Date.now();
    const d = 86400000;
    return [
        { id: "m1", shopId: "s1", productId: "p1", type: "PURCHASE", qty: 12, unitPrice: 1200, total: 14400, gstAmount: 2592, date: now - 7 * d, note: "Monthly restock", counterpartyType: "Supplier", supplierName: "Bosch India Pvt Ltd", referenceId: "BINV-2024-1042", paymentMode: "Credit", paymentStatus: "pending" },
        { id: "m2", shopId: "s1", productId: "p3", type: "PURCHASE", qty: 50, unitPrice: 180, total: 9000, gstAmount: 1620, date: now - 5 * d, note: "Stock up", counterpartyType: "Supplier", supplierName: "Mahle GmbH India", referenceId: "MINV-0892", paymentMode: "Cash", paymentStatus: "paid" },
        { id: "m4", shopId: "s1", productId: "p5", type: "SALE", qty: 2, unitPrice: 3600, total: 7200, gstAmount: 2016, profit: 2400, date: now - 3 * d, note: "Workshop offline order", counterpartyType: "Customer", customerName: "Sri Durga Motors, Dadar", paymentMode: "UPI", paymentStatus: "paid" },
        { id: "m6", shopId: "s1", productId: "p2", type: "ADJUST", qty: -2, unitPrice: 890, total: 0, gstAmount: 0, date: now - 2 * d, note: "Damaged in transit", counterpartyType: "Shop" },
        { id: "m7", shopId: "s1", productId: "p1", type: "SALE", qty: 3, unitPrice: 1850, total: 5550, gstAmount: 999, profit: 1950, date: now - 0.4 * d, note: "Walk-in", counterpartyType: "Customer", customerName: "Hussain Auto", paymentMode: "Cash", paymentStatus: "paid" },
        { id: "m8", shopId: "s1", productId: "p2", type: "SALE", qty: 4, unitPrice: 1400, total: 5600, gstAmount: 1008, profit: 2040, date: now - 4 * d, note: "Mechanic Credit", counterpartyType: "Customer", customerName: "Raju Garage", paymentMode: "Credit", paymentStatus: "pending", creditDays: 15 },
        { id: "m9", shopId: "s1", productId: "p3", type: "SALE", qty: 10, unitPrice: 320, total: 3200, gstAmount: 576, profit: 1400, date: now - 1 * d, note: "Credit Sale", counterpartyType: "Customer", customerName: "Alpha Mechanics", paymentMode: "Credit", paymentStatus: "pending", creditDays: 7 },
    ];
};

export const SEED_ORDERS = [];
export const SEED_PURCHASES = [];

export const fmt = n => "₹" + Math.abs(+n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const fmtN = n => (+n || 0).toLocaleString("en-IN");
export const pct = (a, b) => b > 0 ? (((a) / b) * 100).toFixed(1) + "%" : "0%";
export const margin = (b, s) => s > 0 ? (((s - b) / s) * 100).toFixed(1) : 0;
export const gstAmt = (price, qty, gstRate) => ((price * qty) * gstRate) / 100;

export const fmtDate = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtTime = ts => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
export const fmtDateTime = ts => `${fmtDate(ts)}, ${fmtTime(ts)}`;
export const daysAgo = ts => {
    const diff = Math.floor((Date.now() - ts) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
};

export const stockStatus = p => {
    if (p.stock <= 0) return "out";
    if (p.stock < p.minStock) return "low";
    return "ok";
};

export const STATUS = {
    ok: { label: "In Stock", bg: "rgba(16,185,129,0.12)", color: T.emerald, dot: T.emerald },
    low: { label: "Low Stock", bg: "rgba(245,158,11,0.12)", color: T.amber, dot: T.amber },
    out: { label: "Out of Stock", bg: "rgba(239,68,68,0.12)", color: T.crimson, dot: T.crimson },
};

// === DEEP_RESEARCH AMAZON HELPERS ===
export const getMrp = (product) => product.mrp || Math.round(product.sellPrice * 1.25);
export const getDiscount = (product) => {
    const mrp = getMrp(product);
    if (mrp <= product.sellPrice) return 0;
    return Math.round(((mrp - product.sellPrice) / mrp) * 100);
};
export const getDeliveryEta = () => {
    const h = new Date().getHours();
    if (h < 14) return { text: "Today by 4 PM", fast: true };
    if (h < 18) return { text: "Today by 9 PM", fast: true };
    return { text: "Tomorrow by 2 PM", fast: false };
};
export const getStarRating = (productId) => {
    // Deterministic mock rating from product ID hash
    const hash = productId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rating = 3.5 + (hash % 15) / 10; // 3.5 to 4.9
    const count = 20 + (hash % 200);
    return { rating: Math.min(rating, 4.9).toFixed(1), count };
};
export const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
};
