import { CATEGORIES } from "../../utils";

// -----------------------------------------------------
// GEO-LOCATION MOCK (Haversine Formula Simulation)
// -----------------------------------------------------
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // Mock 5km if missing
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const USER_LAT = 17.4000;
const USER_LNG = 78.4500;

export const getNearDistance = (shop) => {
  if (!shop?.geoLocation) return (Math.random() * 10 + 1).toFixed(1); // MOCK 1-11 KM IF NO GEO
  return getDistanceFromLatLonInKm(USER_LAT, USER_LNG, shop.geoLocation.lat, shop.geoLocation.lng).toFixed(1);
};


// -----------------------------------------------------
// RANKING ENGINE (Unified State Version)
// -----------------------------------------------------
export const rankingEngine = (allProducts, allShops, vehicleCtx = null) => {
  if (!allProducts || !allShops) return [];

  // Group identical products across shops by SKU or Name to create "Master Products"
  const groupedProducts = allProducts.reduce((acc, p) => {
    const key = p.sku || p.name;
    if (!acc[key]) {
      acc[key] = {
        masterTemplate: { ...p },
        listings: []
      };
    }
    const shop = allShops.find(s => s.id === p.shopId);
    if (!shop) return acc;

    acc[key].listings.push({
      ...p,
      shop,
      distance: parseFloat(getNearDistance(shop))
    });
    return acc;
  }, {});

  const vehicleId = vehicleCtx ? `${vehicleCtx.brand} ${vehicleCtx.model}` : null;

  return Object.values(groupedProducts).map(group => {
    const mp = group.masterTemplate;

    // Sort listings lowest price first
    const listings = group.listings.sort((a, b) => a.sellPrice - b.sellPrice);
    if (listings.length === 0) return null;

    const bestListing = listings[0];

    // Determine compatibility string match
    let exactMatch = 0;
    if (vehicleId && mp.compatibleVehicles) {
      if (mp.compatibleVehicles.some(v => v.includes("Universal") || v.includes(vehicleId) || vehicleId.includes(v))) {
        exactMatch = 100;
      }
    }

    // Velocity Mock (Since we don't have global velocity yet)
    const velocityScore = Math.min((listings.reduce((sum, l) => sum + (100 - l.stock), 0) / 100) * 100, 100);

    // Rating Score
    const ratingScore = (bestListing.shop.rating / 5) * 100 || 80;

    // Proximity Score
    const proxScore = Math.max(0, 100 - (bestListing.distance / 15 * 100));

    // Stock Health
    let stockScore = 0;
    const totalAvail = bestListing.stock - (bestListing.reservedStock || 0);
    if (totalAvail > bestListing.minStock) stockScore = 100;
    else if (totalAvail > 0) stockScore = 50;

    // Calculate Final Weighted Rank
    let rankScore = 0;
    if (vehicleId) {
      rankScore = (exactMatch * 0.4) + (velocityScore * 0.2) + (ratingScore * 0.15) + (proxScore * 0.15) + (stockScore * 0.1);
    } else {
      rankScore = (velocityScore * 0.4) + (ratingScore * 0.3) + (proxScore * 0.2) + (stockScore * 0.1);
    }

    // MAP TO OLD SCHEMA FOR UI COMPATIBILITY
    return {
      product: mp, // Unified product treated as master template
      listings: listings.map(l => ({
        product_id: l.id,
        shop_id: l.shop.id,
        shop: l.shop,
        distance: l.distance,
        selling_price: l.sellPrice,
        mrp: l.mrp || (l.sellPrice * 1.2),
        stock_quantity: l.stock - (l.reservedStock || 0),
        min_stock: l.minStock,
        delivery_time: l.distance < 5 ? "Same Day" : "Next Day",
        discount: l.mrp ? Math.round(((l.mrp - l.sellPrice) / l.mrp) * 100) : 0
      })),
      bestPrice: bestListing.sellPrice,
      availability: listings.reduce((sum, l) => sum + (l.stock - (l.reservedStock || 0)), 0),
      shopCount: listings.length,
      fastestEta: listings[0].distance < 5 ? "Same Day" : "Next Day",
      rankScore: parseFloat(rankScore.toFixed(2)),
      isCompatible: exactMatch === 100
    };
  }).filter(Boolean).sort((a, b) => b.rankScore - a.rankScore);
};

// -----------------------------------------------------
// GET HOME PAGE DATA
// -----------------------------------------------------
export const getHomeData = (products, shops, vehicleCtx = null) => {
  const allRanked = rankingEngine(products, shops, vehicleCtx);

  // If vehicle selected, return ALL matching products
  if (vehicleCtx) {
    return {
      compatibleParts: allRanked.filter(p => p.isCompatible)
    };
  }

  // If NO vehicle selected, return generic dynamic sections
  return {
    topSelling: [...allRanked].slice(0, 10),
    trendingNearYou: [...allRanked].sort((a, b) => a.listings[0].distance - b.listings[0].distance).slice(0, 10),
    bestDeals: [...allRanked].sort((a, b) => b.listings[0].discount - a.listings[0].discount).filter(p => p.listings[0].discount > 0).slice(0, 5),
    popularCategories: CATEGORIES.slice(0, 6)
  };
};

// -----------------------------------------------------
// SEARCH ENGINE
// -----------------------------------------------------
export const searchEngine = (query, products, shops, vehicleCtx = null) => {
  if (!query || query.length < 2 || !products || !shops) return { products: [], categories: [], shops: [] };

  const q = query.toLowerCase();

  const matchedCategories = CATEGORIES.filter(c => c.toLowerCase().includes(q));
  const matchedShops = shops.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));

  const productMatches = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );

  const rankedProducts = rankingEngine(productMatches, shops, vehicleCtx);

  return {
    products: rankedProducts.slice(0, 5),
    categories: matchedCategories,
    shops: matchedShops
  };
};
