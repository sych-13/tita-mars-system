import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { firebaseConfigured, firestore } from "../lib/firebase";
import { readStorage, writeStorage } from "../utils/storage";
import { useActivity } from "./ActivityContext";
const ShopContext = createContext();
const STORE_ADDRESS = "2 P. Ocampo, Taytay, 1920 Rizal";
const defaults = {
  name: "Tita Mars Eatery & Bakery",
  phone: "",
  email: "",
  address: STORE_ADDRESS,
  hours: "Open 24/7",
  deliveryFee: 20,
  gcashName: "",
  gcashNumber: "",
  orderingEnabled: true,
  openingTime: "06:00",
  closingTime: "21:00",
  allowScheduledOrders: true,
  maxScheduleDays: 7,
};
const normalizeSettings = (source = {}) => {
  const next = { ...defaults, ...source };
  const address = String(next.address || "").trim();
  if (
    !address ||
    address === "Taytay, Rizal" ||
    address === "02 P. Ocampo St., Brgy. San Isidro, Taytay, Rizal"
  )
    next.address = STORE_ADDRESS;
  return next;
};
export function ShopProvider({ children }) {
  const { logActivity } = useActivity();
  const [settings, setSettings] = useState(() =>
    normalizeSettings(readStorage("tita-mars-settings", {})),
  );
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
      if (snapshot.exists()) setSettings(normalizeSettings(snapshot.data()));
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
        const deliveryFee = Number(next.deliveryFee ?? settings.deliveryFee);
        const maxScheduleDays = Number(
          next.maxScheduleDays ?? settings.maxScheduleDays,
        );
        if (!Number.isInteger(deliveryFee) || deliveryFee < 0)
          return {
            ok: false,
            error: "Delivery fee must be a non-negative whole number.",
          };
        if (
          !Number.isInteger(maxScheduleDays) ||
          maxScheduleDays < 1 ||
          maxScheduleDays > 30
        )
          return {
            ok: false,
            error: "Schedule window must be from 1 to 30 days.",
          };
        const openingTime = String(
          next.openingTime ?? settings.openingTime,
        );
        const closingTime = String(
          next.closingTime ?? settings.closingTime,
        );
        if (
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(openingTime) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(closingTime)
        )
          return { ok: false, error: "Choose valid opening and closing times." };
        const values = {
          name: String(next.name ?? settings.name).trim().slice(0, 120),
          phone: String(next.phone ?? settings.phone).trim().slice(0, 30),
          email: String(next.email ?? settings.email).trim().slice(0, 160),
          address: String(next.address ?? settings.address).trim().slice(0, 300),
          hours: String(next.hours ?? settings.hours).trim().slice(0, 120),
          deliveryFee,
          gcashName: String(next.gcashName ?? settings.gcashName)
            .trim()
            .slice(0, 120),
          gcashNumber: String(next.gcashNumber ?? settings.gcashNumber)
            .trim()
            .slice(0, 30),
          orderingEnabled:
            next.orderingEnabled ?? settings.orderingEnabled ?? true,
          openingTime,
          closingTime,
          allowScheduledOrders:
            next.allowScheduledOrders ??
            settings.allowScheduledOrders ??
            true,
          maxScheduleDays,
        };
        if (!values.name || !values.address || !values.hours)
          return {
            ok: false,
            error: "Business name, hours, and pickup address are required.",
          };
        if (firebaseConfigured && firestore) {
          try {
            await setDoc(doc(firestore, "settings", "store"), values, {
              merge: true,
            });
            await logActivity({
              action: "update_settings",
              entityType: "settings",
              entityId: "store",
              summary: "Updated store, fulfillment, or payment settings.",
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
        await logActivity({
          action: "update_settings",
          entityType: "settings",
          entityId: "store",
          summary: "Updated store, fulfillment, or payment settings.",
        });
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
    [favorites, logActivity, settings],
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
