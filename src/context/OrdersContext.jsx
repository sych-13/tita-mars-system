import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProducts } from "./ProductContext";
import { readStorage, writeStorage } from "../utils/storage";

const OrdersContext = createContext();
const STORAGE_KEY = "tita-mars-orders-v2";
export const orderStatuses = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

export const statusesForOrder = (order) =>
  order?.orderType === "delivery"
    ? [
        "Pending",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Completed",
        "Cancelled",
      ]
    : [
        "Pending",
        "Confirmed",
        "Preparing",
        "Ready for Pickup",
        "Completed",
        "Cancelled",
      ];

const loadLegacyOrders = () => {
  const saved = readStorage(STORAGE_KEY, null);
  if (Array.isArray(saved)) return saved;
  const previous = readStorage("tita-mars-orders", []);
  if (Array.isArray(previous) && previous.length) return previous;
  const last = readStorage("tita-mars-last-order", null);
  return last ? [last] : [];
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeOrder = (order) => ({
  ...order,
  id: order.id || order.number || createId(),
  number:
    order.number ||
    `TM-${String(order.id || Date.now())
      .replace(/[^a-z0-9]/gi, "")
      .slice(-6)
      .toUpperCase()}`,
  status: orderStatuses.includes(order.status) ? order.status : "Pending",
  inventoryDeductedAt: order.inventoryDeductedAt || null,
  items: Array.isArray(order.items) ? order.items : [],
});

export function OrdersProvider({ children }) {
  const { deductInventory, validateOrderItems } = useProducts();
  const [orders, setOrders] = useState(() =>
    loadLegacyOrders().map(normalizeOrder),
  );
  const ordersRef = useRef(orders);

  const commitOrders = useCallback((updater) => {
    const current = ordersRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    ordersRef.current = next;
    setOrders(next);
    return next;
  }, []);

  useEffect(() => {
    ordersRef.current = orders;
    writeStorage(STORAGE_KEY, orders);
    writeStorage("tita-mars-orders", orders);
    if (orders[0]) writeStorage("tita-mars-last-order", orders[0]);
  }, [orders]);

  const createOrder = useCallback(
    (data) => {
      const validation = validateOrderItems(data.items);
      if (!validation.ok) return validation;
      const id = createId();
      const timestamp = new Date().toISOString();
      const order = {
        ...data,
        id,
        number: `TM-${id
          .replace(/[^a-z0-9]/gi, "")
          .slice(-6)
          .toUpperCase()}`,
        status: "Pending",
        createdAt: timestamp,
        updatedAt: timestamp,
        inventoryDeductedAt: null,
      };
      commitOrders((current) => [order, ...current]);
      return { ok: true, order };
    },
    [commitOrders, validateOrderItems],
  );

  const updateOrderStatus = useCallback(
    (id, status) => {
      if (!orderStatuses.includes(status))
        return { ok: false, error: "That order status is not valid." };
      const target = ordersRef.current.find((order) => order.id === id);
      if (!target) return { ok: false, error: "Order not found." };
      if (!statusesForOrder(target).includes(status))
        return {
          ok: false,
          error: `That status does not apply to this ${target.orderType === "delivery" ? "delivery" : "pickup"} order.`,
        };
      if (target.status === "Completed" && status !== "Completed")
        return {
          ok: false,
          error: "Completed orders are locked to protect inventory records.",
        };

      let deductedAt = target.inventoryDeductedAt;
      if (status === "Completed" && !deductedAt) {
        const result = deductInventory(target.items);
        if (!result.ok) return result;
        deductedAt = result.deductedAt;
      }

      const timestamp = new Date().toISOString();
      commitOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                status,
                updatedAt: timestamp,
                inventoryDeductedAt:
                  status === "Completed"
                    ? order.inventoryDeductedAt || deductedAt
                    : order.inventoryDeductedAt,
              }
            : order,
        ),
      );
      return { ok: true };
    },
    [commitOrders, deductInventory],
  );

  const saveReview = useCallback(
    (id, review) => {
      const target = ordersRef.current.find((order) => order.id === id);
      if (!target || target.status !== "Completed")
        return {
          ok: false,
          error: "You can review an order once it is completed.",
        };
      if (target.review)
        return { ok: false, error: "This order already has a review." };
      if (
        !Number.isInteger(review.rating) ||
        review.rating < 1 ||
        review.rating > 5
      )
        return { ok: false, error: "Choose a rating from 1 to 5." };
      commitOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                review: {
                  rating: review.rating,
                  comment: review.comment.trim().slice(0, 600),
                  createdAt: new Date().toISOString(),
                },
              }
            : order,
        ),
      );
      return { ok: true };
    },
    [commitOrders],
  );
  const value = useMemo(
    () => ({ orders, createOrder, updateOrderStatus, saveReview }),
    [createOrder, orders, updateOrderStatus, saveReview],
  );
  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export const useOrders = () => useContext(OrdersContext);
