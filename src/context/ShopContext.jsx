import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readStorage, writeStorage } from "../utils/storage";
const ShopContext = createContext();
const defaults = {
  name: "Tita Mars Eatery & Bakery",
  phone: "",
  email: "",
  address: "Taytay, Rizal",
  hours: "Open 24/7",
  deliveryFee: 20,
  gcashName: "",
  gcashNumber: "",
};
export function ShopProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...defaults,
    ...readStorage("tita-mars-settings", {}),
  }));
  const [favorites, setFavorites] = useState(() =>
    readStorage("tita-mars-favorites", []),
  );
  const [notice, setNotice] = useState("");
  useEffect(() => writeStorage("tita-mars-settings", settings), [settings]);
  useEffect(() => writeStorage("tita-mars-favorites", favorites), [favorites]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);
  const value = useMemo(
    () => ({
      settings,
      saveSettings: setSettings,
      favorites,
      toggleFavorite: (id) =>
        setFavorites((current) =>
          current.includes(id)
            ? current.filter((value) => value !== id)
            : [...current, id],
        ),
      notify: setNotice,
    }),
    [settings, favorites],
  );
  return (
    <ShopContext.Provider value={value}>
      {children}
      <div
        className={`toast-message ${notice ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </ShopContext.Provider>
  );
}
export const useShop = () => useContext(ShopContext);
