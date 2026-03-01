import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { SEED_PRODUCTS, SEED_SHOPS, genSeededMovements, SEED_ORDERS, SEED_PURCHASES } from "./utils";

export const StoreContext = createContext(null);

export function useStoreProvider() {
    const [shops, setShops] = useState(null);
    const [products, setP] = useState(null);
    const [movements, setM] = useState(null);
    const [orders, setOrders] = useState(null);
    const [purchases, setPurchases] = useState(null);

    // Global User States
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [appMode, setAppMode] = useState("marketplace");
    const [activeShopId, setActiveShopId] = useState("s1");
    const [marketplacePage, setMarketplacePage] = useState("home");

    const [loaded, setL] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const storedShops = localStorage.getItem("vl_shops");
                const storedProducts = localStorage.getItem("vl_products");
                const storedMovements = localStorage.getItem("vl_movements");
                const storedOrders = localStorage.getItem("vl_orders");
                const storedPurchases = localStorage.getItem("vl_purchases");
                const storedVehicle = localStorage.getItem("vl_vehicle");
                const storedCart = localStorage.getItem("vl_cart");
                const storedAppMode = localStorage.getItem("vl_appMode");

                setShops(storedShops ? JSON.parse(storedShops) : SEED_SHOPS);
                setP(storedProducts ? JSON.parse(storedProducts) : SEED_PRODUCTS);
                setM(storedMovements ? JSON.parse(storedMovements) : genSeededMovements());
                setOrders(storedOrders ? JSON.parse(storedOrders) : SEED_ORDERS);
                setPurchases(storedPurchases ? JSON.parse(storedPurchases) : SEED_PURCHASES);

                if (storedVehicle) setSelectedVehicle(JSON.parse(storedVehicle));
                if (storedCart) setCart(JSON.parse(storedCart));
                if (storedAppMode) setAppMode(storedAppMode);
            } catch {
                setShops(SEED_SHOPS);
                setP(SEED_PRODUCTS);
                setM(genSeededMovements());
                setOrders(SEED_ORDERS);
                setPurchases(SEED_PURCHASES);
            }
            setL(true);
        })();
    }, []);

    const saveShops = useCallback(d => { setShops(d); try { localStorage.setItem("vl_shops", JSON.stringify(d)); } catch { } }, []);
    const saveProducts = useCallback(d => { setP(d); try { localStorage.setItem("vl_products", JSON.stringify(d)); } catch { } }, []);
    const saveMovements = useCallback(d => { setM(d); try { localStorage.setItem("vl_movements", JSON.stringify(d)); } catch { } }, []);
    const saveOrders = useCallback(d => { setOrders(d); try { localStorage.setItem("vl_orders", JSON.stringify(d)); } catch { } }, []);
    const savePurchases = useCallback(d => { setPurchases(d); try { localStorage.setItem("vl_purchases", JSON.stringify(d)); } catch { } }, []);

    const saveCart = useCallback(d => { setCart(d); try { localStorage.setItem("vl_cart", JSON.stringify(d)); } catch { } }, []);
    const saveVehicle = useCallback(d => { setSelectedVehicle(d); try { localStorage.setItem("vl_vehicle", JSON.stringify(d)); } catch { } }, []);
    const saveAppMode = useCallback(d => { setAppMode(d); try { localStorage.setItem("vl_appMode", d); } catch { } }, []);

    const toggleCart = useCallback(() => { setIsCartOpen(prev => !prev); }, []);

    const resetAll = useCallback(async () => {
        setShops(SEED_SHOPS); setP(SEED_PRODUCTS); setM(genSeededMovements()); setOrders(SEED_ORDERS); setPurchases(SEED_PURCHASES);
        setCart([]); setSelectedVehicle(null);
        try {
            localStorage.setItem("vl_shops", JSON.stringify(SEED_SHOPS));
            localStorage.setItem("vl_products", JSON.stringify(SEED_PRODUCTS));
            localStorage.setItem("vl_movements", JSON.stringify(genSeededMovements()));
            localStorage.setItem("vl_orders", JSON.stringify(SEED_ORDERS));
            localStorage.setItem("vl_purchases", JSON.stringify(SEED_PURCHASES));
            localStorage.removeItem("vl_cart");
            localStorage.removeItem("vl_vehicle");
        } catch { }
    }, []);

    return {
        shops, products, movements, orders, purchases,
        saveShops, saveProducts, saveMovements, saveOrders, savePurchases,
        cart, saveCart, isCartOpen, setIsCartOpen, toggleCart,
        selectedVehicle, saveVehicle,
        appMode, saveAppMode,
        activeShopId, setActiveShopId,
        marketplacePage, setMarketplacePage,
        resetAll, loaded
    };
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error("useStore must be used within a StoreProvider");
    return ctx;
}
