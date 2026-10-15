import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  firebaseAuth,
  firebaseConfigured,
  firebaseFunctions,
  firestore,
  trustedBackendEnabled,
} from "../lib/firebase";
import {
  orderStatuses,
  paymentStatusForOrder,
  statusChangesForOrder,
  statusesForOrder,
  summarizeOrderItems,
} from "../utils/orderFlow";
import { readStorage, writeStorage } from "../utils/storage";
import { useProducts } from "./ProductContext";
import { useSession } from "./SessionContext";
import { useShop } from "./ShopContext";
import { useActivity } from "./ActivityContext";
import { validateOrderSchedule } from "../utils/businessHours";

const OrdersContext = createContext();
const STORAGE_KEY = "tita-mars-orders-v2";

export { orderStatuses, statusChangesForOrder, statusesForOrder };

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

const toIsoDate = (value) =>
  typeof value === "string"
    ? value
    : value?.toDate
      ? value.toDate().toISOString()
      : value || null;

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
  paymentStatus: paymentStatusForOrder(order),
  paymentVerifiedAt: toIsoDate(order.paymentVerifiedAt),
  paymentVerifiedBy:
    typeof order.paymentVerifiedBy === "string"
      ? order.paymentVerifiedBy
      : null,
  createdAt: toIsoDate(order.createdAt),
  updatedAt: toIsoDate(order.updatedAt),
  inventoryDeductedAt: toIsoDate(order.inventoryDeductedAt),
  scheduledFor: toIsoDate(order.scheduledFor),
  fulfillmentTiming:
    order.fulfillmentTiming === "scheduled" ? "scheduled" : "asap",
  gcashReference:
    typeof order.gcashReference === "string" ? order.gcashReference : "",
  gcashSenderName:
    typeof order.gcashSenderName === "string" ? order.gcashSenderName : "",
  gcashPaidAt: toIsoDate(order.gcashPaidAt),
  gcashPaymentNote:
    typeof order.gcashPaymentNote === "string" ? order.gcashPaymentNote : "",
  paymentSubmittedAt: toIsoDate(order.paymentSubmittedAt),
  statusHistory: Array.isArray(order.statusHistory)
    ? order.statusHistory.map((entry) => ({
        ...entry,
        at: toIsoDate(entry.at),
      }))
    : [
        {
          status: order.status || "Pending",
          at: toIsoDate(order.createdAt),
          actorId: order.customerId || "system",
          actorName: order.customer || "Customer",
          actorRole: "customer",
        },
      ],
  items: Array.isArray(order.items) ? order.items : [],
});

const orderError = (error, fallback) => {
  if (
    error?.code === "permission-denied" ||
    error?.code === "firestore/permission-denied"
  )
    return "Your account does not have permission for that order action.";
  return error?.message || fallback;
};

const canRetryWithFreshAuth = (error) =>
  [
    "permission-denied",
    "firestore/permission-denied",
    "unauthenticated",
    "firestore/unauthenticated",
  ].includes(error?.code);

export function OrdersProvider({ children }) {
  const { deductInventory, validateOrderItems } = useProducts();
  const { user, role } = useSession();
  const { settings } = useShop();
  const { logActivity } = useActivity();
  const [orders, setOrders] = useState(() =>
    firebaseConfigured ? [] : loadLegacyOrders().map(normalizeOrder),
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
  }, [orders]);

  useEffect(() => {
    if (!firebaseConfigured) {
      writeStorage(STORAGE_KEY, orders);
      writeStorage("tita-mars-orders", orders);
      if (orders[0]) writeStorage("tita-mars-last-order", orders[0]);
    }
  }, [orders]);

  useEffect(() => {
    if (!firebaseConfigured || !firestore) return undefined;
    if (!user) {
      commitOrders([]);
      return undefined;
    }
    const orderCollection = collection(firestore, "orders");
    const source =
      role === "staff" || role === "owner"
        ? orderCollection
        : query(orderCollection, where("customerId", "==", user.id));
    return onSnapshot(
      source,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => normalizeOrder({ id: item.id, ...item.data() }))
          .sort(
            (left, right) =>
              new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
          );
        commitOrders(next);
      },
      () => commitOrders([]),
    );
  }, [commitOrders, role, user]);

  const createOrder = useCallback(
    async (data) => {
      const validation = validateOrderItems(data.items);
      if (!validation.ok) return validation;
      const customer = data.customer?.trim() || "";
      const phone = data.phone?.trim() || "";
      const address = data.address?.trim() || "";
      if (!customer || !phone || (data.orderType === "delivery" && !address))
        return {
          ok: false,
          error: "Complete the customer and delivery details first.",
        };
      if (!["pickup", "delivery"].includes(data.orderType))
        return { ok: false, error: "Choose pickup or delivery." };
      if (!["cash", "gcash"].includes(data.payment))
        return { ok: false, error: "Choose Cash or GCash." };
      if (
        data.orderType === "delivery" &&
        !["Taytay", "Cainta"].includes(data.deliveryArea)
      )
        return {
          ok: false,
          error: "Delivery is currently available only in Taytay and Cainta.",
        };
      const schedule = validateOrderSchedule(
        settings,
        data.fulfillmentTiming,
        data.scheduledFor,
      );
      if (!schedule.ok) return schedule;
      const gcashReference =
        data.payment === "gcash"
          ? String(data.gcashReference || "").replace(/\s+/g, "")
          : "";
      if (gcashReference && !/^\d{8,20}$/.test(gcashReference))
        return {
          ok: false,
          error: "GCash reference number must contain 8 to 20 digits.",
        };
      const gcashPaidAt = data.gcashPaidAt
        ? new Date(data.gcashPaidAt)
        : null;
      if (gcashPaidAt && Number.isNaN(gcashPaidAt.getTime()))
        return { ok: false, error: "Enter a valid GCash payment date." };
      const timestamp = new Date().toISOString();

      if (firebaseConfigured && firestore) {
        if (!user)
          return {
            ok: false,
            error: "Sign in before placing an order so it can be tracked securely.",
          };
        if (trustedBackendEnabled && firebaseFunctions) {
          try {
            const placeOrder = httpsCallable(firebaseFunctions, "createOrder");
            const response = await placeOrder({
              customer,
              phone,
              email: data.email?.trim().toLowerCase() || "",
              address: data.orderType === "delivery" ? address : "",
              deliveryArea:
                data.orderType === "delivery" ? data.deliveryArea : "",
              notes: data.notes?.trim() || "",
              orderType: data.orderType,
              payment: data.payment,
              fulfillmentTiming:
                data.fulfillmentTiming === "scheduled" ? "scheduled" : "asap",
              scheduledFor: schedule.scheduledFor,
              gcashReference,
              gcashSenderName:
                data.payment === "gcash"
                  ? data.gcashSenderName?.trim().slice(0, 120) || ""
                  : "",
              gcashPaidAt: gcashPaidAt?.toISOString() || null,
              gcashPaymentNote:
                data.payment === "gcash"
                  ? data.gcashPaymentNote?.trim().slice(0, 300) || ""
                  : "",
              items: data.items.map(({ id, quantity }) => ({ id, quantity })),
            });
            const orderData = response.data?.order;
            if (!orderData?.id)
              throw new Error("The backend returned an invalid order.");
            const order = normalizeOrder(orderData);
            return { ok: true, order };
          } catch (error) {
            return {
              ok: false,
              error: orderError(error, "Unable to place your order."),
            };
          }
        }
        try {
          const orderRef = doc(collection(firestore, "orders"));
          let order;
          await runTransaction(firestore, async (transaction) => {
            const productRefs = [...validation.required.keys()].map((id) =>
              doc(firestore, "products", id),
            );
            const settingsRef = doc(firestore, "settings", "store");
            const snapshots = await Promise.all([
              ...productRefs.map((productRef) => transaction.get(productRef)),
              transaction.get(settingsRef),
            ]);
            const settingsSnapshot = snapshots.pop();
            const productSnapshots = snapshots;
            const items = productSnapshots.map((snapshot, index) => {
              const quantity = validation.required.get(productRefs[index].id);
              if (!snapshot.exists())
                throw new Error("A product in your cart no longer exists.");
              const product = snapshot.data();
              const price = Number(product.price);
              if (
                product.archived ||
                product.available === false ||
                !Number.isFinite(price) ||
                price < 0 ||
                Number(product.stock || 0) < quantity
              )
                throw new Error(
                  "One or more items are no longer available in the requested quantity. Please review your cart.",
                );
              return {
                id: productRefs[index].id,
                name: product.name,
                supplier: product.supplier,
                category: product.category,
                image: product.image,
                price,
                quantity,
              };
            });
            const subtotal = items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
            const configuredFee = Number(
              settingsSnapshot.exists()
                ? settingsSnapshot.data().deliveryFee
                : 20,
            );
            const deliveryFee =
              data.orderType === "delivery" && Number.isFinite(configuredFee)
                ? Math.max(0, configuredFee)
                : 0;
            order = {
              id: orderRef.id,
              customerId: user.id,
              customer: customer.slice(0, 120),
              phone: phone.slice(0, 30),
              email: data.email?.trim().toLowerCase().slice(0, 160) || "",
              address:
                data.orderType === "delivery"
                  ? address.slice(0, 300)
                  : "",
              deliveryArea:
                data.orderType === "delivery" ? data.deliveryArea : "",
              notes: data.notes?.trim().slice(0, 600) || "",
              orderType: data.orderType,
              payment: data.payment,
              paymentStatus:
                data.payment === "gcash"
                  ? "Pending Verification"
                  : "Not Required",
              paymentVerifiedAt: null,
              paymentVerifiedBy: null,
              gcashReference,
              gcashSenderName:
                data.payment === "gcash"
                  ? data.gcashSenderName?.trim().slice(0, 120) || ""
                  : "",
              gcashPaidAt: gcashPaidAt?.toISOString() || null,
              gcashPaymentNote:
                data.payment === "gcash"
                  ? data.gcashPaymentNote?.trim().slice(0, 300) || ""
                  : "",
              paymentSubmittedAt:
                data.payment === "gcash" && gcashReference ? timestamp : null,
              fulfillmentTiming:
                data.fulfillmentTiming === "scheduled" ? "scheduled" : "asap",
              scheduledFor: schedule.scheduledFor,
              subtotal,
              deliveryFee,
              total: subtotal + deliveryFee,
              items,
              number: `TM-${orderRef.id
                .replace(/[^a-z0-9]/gi, "")
                .slice(-6)
                .toUpperCase()}`,
              status: "Pending",
              createdAt: timestamp,
              updatedAt: timestamp,
              inventoryDeductedAt: null,
              statusHistory: [
                {
                  status: "Pending",
                  at: timestamp,
                  actorId: user.id,
                  actorName: customer.slice(0, 120),
                  actorRole: "customer",
                },
              ],
            };
            transaction.set(orderRef, order);
          });
          return { ok: true, order };
        } catch (error) {
          return { ok: false, error: orderError(error, "Unable to place your order.") };
        }
      }

      const id = createId();
      const order = {
        ...data,
        id,
        number: `TM-${id
          .replace(/[^a-z0-9]/gi, "")
          .slice(-6)
          .toUpperCase()}`,
        status: "Pending",
        paymentStatus:
          data.payment === "gcash" ? "Pending Verification" : "Not Required",
        paymentVerifiedAt: null,
        paymentVerifiedBy: null,
        gcashReference,
        gcashSenderName:
          data.payment === "gcash"
            ? data.gcashSenderName?.trim().slice(0, 120) || ""
            : "",
        gcashPaidAt: gcashPaidAt?.toISOString() || null,
        gcashPaymentNote:
          data.payment === "gcash"
            ? data.gcashPaymentNote?.trim().slice(0, 300) || ""
            : "",
        paymentSubmittedAt:
          data.payment === "gcash" && gcashReference ? timestamp : null,
        fulfillmentTiming:
          data.fulfillmentTiming === "scheduled" ? "scheduled" : "asap",
        scheduledFor: schedule.scheduledFor,
        createdAt: timestamp,
        updatedAt: timestamp,
        inventoryDeductedAt: null,
        statusHistory: [
          {
            status: "Pending",
            at: timestamp,
            actorId: user?.id || "local-customer",
            actorName: customer.slice(0, 120),
            actorRole: "customer",
          },
        ],
      };
      commitOrders((current) => [order, ...current]);
      return { ok: true, order };
    },
    [commitOrders, settings, user, validateOrderItems],
  );

  const updateOrderStatus = useCallback(
    async (id, status) => {
      if (!orderStatuses.includes(status))
        return { ok: false, error: "That order status is not valid." };
      if (firebaseConfigured && firestore) {
        if (!user || !["staff", "owner"].includes(role))
          return { ok: false, error: "Only staff or the owner can update an order." };
        if (trustedBackendEnabled && firebaseFunctions) {
          try {
            const changeStatus = httpsCallable(
              firebaseFunctions,
              "updateOrderStatus",
            );
            await changeStatus({ orderId: id, status });
            return { ok: true };
          } catch (error) {
            return {
              ok: false,
              error: orderError(error, "Unable to update this order."),
            };
          }
        }
        try {
          const persistStatusUpdate = () =>
            runTransaction(firestore, async (transaction) => {
            const orderRef = doc(firestore, "orders", id);
            const orderSnapshot = await transaction.get(orderRef);
            if (!orderSnapshot.exists()) throw new Error("Order not found.");
            const current = normalizeOrder({ id: orderSnapshot.id, ...orderSnapshot.data() });
            if (!statusChangesForOrder(current).includes(status))
              throw new Error(
                `Move this order to its next ${current.orderType === "delivery" ? "delivery" : "pickup"} status first.`,
              );
            if (
              ["Completed", "Cancelled"].includes(current.status) &&
              status !== current.status
            )
              throw new Error(
                `${current.status} orders are locked to protect order and inventory records.`,
              );

            const timestamp = new Date().toISOString();
            const statusEntry = {
              status,
              at: timestamp,
              actorId: user.id,
              actorName: user.name || role,
              actorRole: role,
            };
            const changes = {
              status,
              updatedAt: timestamp,
              statusHistory:
                status === current.status
                  ? current.statusHistory
                  : [...current.statusHistory, statusEntry],
            };
            if (status === "Completed" && !current.inventoryDeductedAt) {
              const summary = summarizeOrderItems(current.items);
              if (!summary.ok)
                throw new Error(
                  "This order contains invalid items and cannot be completed.",
                );
              const productRefs = [...summary.quantities.keys()].map(
                (productId) => doc(firestore, "products", productId),
              );
              const productSnapshots = await Promise.all(
                productRefs.map((productRef) => transaction.get(productRef)),
              );
              productSnapshots.forEach((productSnapshot, index) => {
                const quantity = summary.quantities.get(productRefs[index].id);
                if (
                  !productSnapshot.exists() ||
                  Number(productSnapshot.data().stock || 0) < quantity
                )
                  throw new Error(
                    "A product no longer has enough finished-product stock to complete this order.",
                  );
              });
              productSnapshots.forEach((productSnapshot, index) => {
                const productRef = productRefs[index];
                const product = productSnapshot.data();
                const quantity = summary.quantities.get(productRef.id);
                const stock =
                  Number(product.stock || 0) -
                  quantity;
                transaction.update(productRef, {
                  stock,
                  available: stock > 0 ? product.available !== false : false,
                  updatedAt: timestamp,
                });
                const movementRef = doc(
                  collection(firestore, "inventoryMovements"),
                );
                transaction.set(movementRef, {
                  id: movementRef.id,
                  productId: productRef.id,
                  productName: product.name,
                  supplier: product.supplier,
                  type: "order_deduction",
                  quantity: -quantity,
                  beforeStock: Number(product.stock || 0),
                  afterStock: stock,
                  orderId: current.id,
                  orderNumber: current.number,
                  reason: `Completed order ${current.number}`,
                  actorId: user.id,
                  actorName: user.name || role,
                  actorRole: role,
                  createdAt: timestamp,
                });
              });
              changes.inventoryDeductedAt = timestamp;
            }
              transaction.update(orderRef, changes);
              return normalizeOrder({ ...current, ...changes });
            });
          let updatedOrder;
          try {
            updatedOrder = await persistStatusUpdate();
          } catch (error) {
            if (!canRetryWithFreshAuth(error) || !firebaseAuth?.currentUser)
              throw error;
            await firebaseAuth.currentUser.getIdToken(true);
            updatedOrder = await persistStatusUpdate();
          }
          commitOrders((current) =>
            current.map((order) =>
              order.id === id ? updatedOrder : order,
            ),
          );
          await logActivity({
            action: "update_order_status",
            entityType: "order",
            entityId: id,
            summary: `Updated ${ordersRef.current.find((order) => order.id === id)?.number || id} to ${status}.`,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: orderError(error, "Unable to update this order.") };
        }
      }

      const target = ordersRef.current.find((order) => order.id === id);
      if (!target) return { ok: false, error: "Order not found." };
      if (!statusChangesForOrder(target).includes(status))
        return {
          ok: false,
          error: `Move this order to its next ${target.orderType === "delivery" ? "delivery" : "pickup"} status first.`,
        };
      if (
        ["Completed", "Cancelled"].includes(target.status) &&
        status !== target.status
      )
        return {
          ok: false,
          error: `${target.status} orders are locked to protect order and inventory records.`,
        };

      let deductedAt = target.inventoryDeductedAt;
      if (status === "Completed" && !deductedAt) {
        const result = deductInventory(target.items, target);
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
              statusHistory:
                status === order.status
                  ? order.statusHistory
                  : [
                      ...order.statusHistory,
                      {
                        status,
                        at: timestamp,
                        actorId: user?.id || role,
                        actorName: user?.name || role,
                        actorRole: role,
                      },
                    ],
                inventoryDeductedAt:
                  status === "Completed"
                    ? order.inventoryDeductedAt || deductedAt
                    : order.inventoryDeductedAt,
              }
            : order,
        ),
      );
      await logActivity({
        action: "update_order_status",
        entityType: "order",
        entityId: id,
        summary: `Updated ${target.number} to ${status}.`,
      });
      return { ok: true };
    },
    [commitOrders, deductInventory, logActivity, role, user],
  );

  const updatePaymentStatus = useCallback(
    async (id, paymentStatus) => {
      if (!["Pending Verification", "Verified"].includes(paymentStatus))
        return { ok: false, error: "That payment status is not valid." };
      const target = ordersRef.current.find((order) => order.id === id);
      if (!target) return { ok: false, error: "Order not found." };
      if (target.payment !== "gcash")
        return {
          ok: false,
          error: "Only GCash orders need manual payment verification.",
        };
      if (firebaseConfigured && firestore) {
        if (!user || !["staff", "owner"].includes(role))
          return {
            ok: false,
            error: "Only staff or the owner can verify a GCash payment.",
          };
        if (trustedBackendEnabled && firebaseFunctions) {
          try {
            const changePaymentStatus = httpsCallable(
              firebaseFunctions,
              "updatePaymentStatus",
            );
            await changePaymentStatus({ orderId: id, paymentStatus });
            return { ok: true };
          } catch (error) {
            return {
              ok: false,
              error: orderError(error, "Unable to update this payment."),
            };
          }
        }
        try {
          await runTransaction(firestore, async (transaction) => {
            const orderRef = doc(firestore, "orders", id);
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists()) throw new Error("Order not found.");
            if (snapshot.data().payment !== "gcash")
              throw new Error(
                "Only GCash orders need manual payment verification.",
              );
            const timestamp = new Date().toISOString();
            transaction.update(orderRef, {
              paymentStatus,
              paymentVerifiedAt:
                paymentStatus === "Verified" ? timestamp : null,
              paymentVerifiedBy:
                paymentStatus === "Verified" ? user.id : null,
              updatedAt: timestamp,
            });
          });
          await logActivity({
            action:
              paymentStatus === "Verified"
                ? "verify_payment"
                : "reopen_payment",
            entityType: "payment",
            entityId: id,
            summary: `${target.number} payment marked ${paymentStatus.toLowerCase()}.`,
          });
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: orderError(error, "Unable to update this payment."),
          };
        }
      }

      const timestamp = new Date().toISOString();
      commitOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                paymentStatus,
                paymentVerifiedAt:
                  paymentStatus === "Verified" ? timestamp : null,
                paymentVerifiedBy:
                  paymentStatus === "Verified" ? user?.id || role : null,
                updatedAt: timestamp,
              }
            : order,
        ),
      );
      await logActivity({
        action:
          paymentStatus === "Verified" ? "verify_payment" : "reopen_payment",
        entityType: "payment",
        entityId: id,
        summary: `${target.number} payment marked ${paymentStatus.toLowerCase()}.`,
      });
      return { ok: true };
    },
    [commitOrders, logActivity, role, user],
  );

  const submitPaymentDetails = useCallback(
    async (id, details) => {
      const target = ordersRef.current.find((order) => order.id === id);
      if (!target) return { ok: false, error: "Order not found." };
      if (target.payment !== "gcash")
        return { ok: false, error: "This order does not use GCash." };
      if (target.paymentStatus === "Verified")
        return { ok: false, error: "This payment is already verified." };
      const reference = String(details.reference || "").replace(/\s+/g, "");
      const senderName = String(details.senderName || "").trim().slice(0, 120);
      const paidAt = new Date(details.paidAt);
      const note = String(details.note || "").trim().slice(0, 300);
      if (!/^\d{8,20}$/.test(reference))
        return {
          ok: false,
          error: "GCash reference number must contain 8 to 20 digits.",
        };
      if (!senderName)
        return { ok: false, error: "Enter the GCash sender name." };
      if (!details.paidAt || Number.isNaN(paidAt.getTime()))
        return { ok: false, error: "Enter a valid payment date and time." };
      const timestamp = new Date().toISOString();
      const changes = {
        gcashReference: reference,
        gcashSenderName: senderName,
        gcashPaidAt: paidAt.toISOString(),
        gcashPaymentNote: note,
        paymentSubmittedAt: timestamp,
        updatedAt: timestamp,
      };
      if (firebaseConfigured && firestore) {
        if (!user || target.customerId !== user.id)
          return {
            ok: false,
            error: "Only the customer who placed this order can submit payment details.",
          };
        try {
          await runTransaction(firestore, async (transaction) => {
            const orderRef = doc(firestore, "orders", id);
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists()) throw new Error("Order not found.");
            const live = snapshot.data();
            if (
              live.customerId !== user.id ||
              live.payment !== "gcash" ||
              live.paymentStatus === "Verified"
            )
              throw new Error("Payment details can no longer be changed.");
            transaction.update(orderRef, changes);
          });
          await logActivity({
            action: "submit_payment_details",
            entityType: "payment",
            entityId: id,
            summary: `Submitted GCash payment details for ${target.number}.`,
          });
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: orderError(error, "Unable to submit payment details."),
          };
        }
      }
      commitOrders((current) =>
        current.map((order) =>
          order.id === id ? { ...order, ...changes } : order,
        ),
      );
      await logActivity({
        action: "submit_payment_details",
        entityType: "payment",
        entityId: id,
        summary: `Submitted GCash payment details for ${target.number}.`,
      });
      return { ok: true };
    },
    [commitOrders, logActivity, user],
  );

  const saveReview = useCallback(
    async (id, review) => {
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
      const savedReview = {
        rating: review.rating,
        comment: review.comment.trim().slice(0, 600),
        createdAt: new Date().toISOString(),
      };
      if (firebaseConfigured && firestore) {
        try {
          await runTransaction(firestore, async (transaction) => {
            const ref = doc(firestore, "orders", id);
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists() || snapshot.data().review)
              throw new Error("This order already has a review.");
            transaction.update(ref, { review: savedReview });
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: orderError(error, "Unable to save your review.") };
        }
      }
      commitOrders((current) =>
        current.map((order) =>
          order.id === id ? { ...order, review: savedReview } : order,
        ),
      );
      return { ok: true };
    },
    [commitOrders],
  );

  const value = useMemo(
    () => ({
      orders,
      createOrder,
      updateOrderStatus,
      updatePaymentStatus,
      submitPaymentDetails,
      saveReview,
    }),
    [
      createOrder,
      orders,
      updateOrderStatus,
      updatePaymentStatus,
      submitPaymentDetails,
      saveReview,
    ],
  );
  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export const useOrders = () => useContext(OrdersContext);
