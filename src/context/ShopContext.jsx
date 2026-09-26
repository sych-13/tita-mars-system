import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { firebaseConfigured, firestore } from "../lib/firebase";
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
  useEffect(() => {
    if (!firebaseConfigured) writeStorage("tita-mars-settings", settings);
  }, [settings]);
  useEffect(() => {
    if (!firebaseConfigured || !firestore) return undefined;
    return onSnapshot(doc(firestore, "settings", "store"), (snapshot) => {
      if (snapshot.exists()) setSettings({ ...defaults, ...snapshot.data() });
    });
  }, []);
  useEffect(() => writeStorage("tita-mars-favorites", favorites), [favorites]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);
  const value = useMemo(
    () => ({
      settings,
      saveSettings: async (next) => {
        const values = { ...settings, ...next };
        if (firebaseConfigured && firestore) {
          try {
            await setDoc(doc(firestore, "settings", "store"), values, {
              merge: true,
            });
            return { ok: true };
          } catch (error) {
            return {
              ok: false,
              error:
                error?.code === "permission-denied" ||
                error?.code === "firestore/permission-denied"
                  ? "Only the owner can change store settings."
                  : "Unable to save store settings.",
            };
          }
        }
        setSettings(values);
        return { ok: true };
      },
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
