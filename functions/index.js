const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const REGION = "asia-southeast1";
const DELIVERY_AREAS = new Set(["Taytay", "Cainta"]);
const PAYMENT_METHODS = new Set(["cash", "gcash"]);
const ORDER_TYPES = new Set(["pickup", "delivery"]);
const ORDER_STATUSES = new Set([
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
]);

const callableOptions = {
  region: REGION,
  enforceAppCheck: false,
  cors: true,
  maxInstances: 10,
};

const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const manilaMinutes = (value) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(mapped.hour) * 60 + Number(mapped.minute);
};

const timeMinutes = (value, fallback) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return fallback;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 1440 ? minutes : fallback;
};

const openAt = (settings, date) => {
  const opens = timeMinutes(settings.openingTime, 360);
  const closes = timeMinutes(settings.closingTime, 1260);
  if (opens === closes) return true;
  const current = manilaMinutes(date);
  return opens < closes
    ? current >= opens && current < closes
    : current >= opens || current < closes;
};

const validateSchedule = (settings, timing, value) => {
  if (settings.orderingEnabled === false)
    throw businessError("Online ordering is currently paused.");
  const now = new Date();
  if (timing !== "scheduled") {
    if (!openAt(settings, now))
      throw businessError(
        settings.allowScheduledOrders === false
          ? "The store is currently closed."
          : "The store is closed right now. Choose a scheduled pickup or delivery time.",
      );
    return null;
  }
  if (settings.allowScheduledOrders === false)
    throw businessError("Scheduled orders are not enabled.");
  const scheduled = new Date(value);
  if (!value || Number.isNaN(scheduled.getTime()))
    throw businessError("Choose a valid order date and time.", "invalid-argument");
  if (scheduled.getTime() < now.getTime() + 15 * 60 * 1000)
    throw businessError("Scheduled orders must be at least 15 minutes from now.");
  const maxDays = Math.min(30, Math.max(1, Number(settings.maxScheduleDays) || 7));
  if (scheduled.getTime() > now.getTime() + maxDays * 86400000)
    throw businessError(`Choose a schedule within the next ${maxDays} days.`);
  if (!openAt(settings, scheduled))
    throw businessError("Choose a time within the configured store hours.");
  return scheduled.toISOString();
};

const businessError = (message, code = "failed-precondition") =>
  new HttpsError(code, message);

function normalizeCartItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50)
    throw businessError("Your cart is empty or contains too many items.", "invalid-argument");

  const quantities = new Map();
  for (const item of items) {
    const id = cleanText(item?.id, 40).toUpperCase();
    const quantity = Number(item?.quantity);
    if (
      !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(id) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000
    )
      throw businessError(
        "Your cart contains an invalid item quantity.",
        "invalid-argument",
      );
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  return quantities;
}

function nextStatuses(order) {
  const pickupOrDelivery =
    order.orderType === "delivery" ? "Out for Delivery" : "Ready for Pickup";
  return {
    Pending: new Set(["Pending", "Confirmed", "Cancelled"]),
    Confirmed: new Set(["Confirmed", "Preparing", "Cancelled"]),
    Preparing: new Set(["Preparing", pickupOrDelivery, "Cancelled"]),
    "Ready for Pickup": new Set(["Ready for Pickup", "Completed", "Cancelled"]),
    "Out for Delivery": new Set(["Out for Delivery", "Completed", "Cancelled"]),
    Completed: new Set(["Completed"]),
    Cancelled: new Set(["Cancelled"]),
  }[order.status] || new Set();
}

async function requireActiveProfile(uid, allowedRoles) {
  const snapshot = await db.doc(`profiles/${uid}`).get();
  const profile = snapshot.exists ? snapshot.data() : null;
  if (!profile || profile.active !== true)
    throw businessError("This account is not active.", "permission-denied");
  if (allowedRoles && !allowedRoles.includes(profile.role))
    throw businessError(
      "Your account does not have permission for this action.",
      "permission-denied",
    );
  return profile;
}

exports.createOrder = onCall(callableOptions, async (request) => {
  if (!request.auth)
    throw businessError("Sign in before placing an order.", "unauthenticated");

  const profile = await requireActiveProfile(request.auth.uid);
  const input = request.data || {};
  const quantities = normalizeCartItems(input.items);
  const customer = cleanText(input.customer || profile.name, 120);
  const phone = cleanText(input.phone || profile.phone, 30);
  const email = cleanText(input.email || profile.email, 160).toLowerCase();
  const address = cleanText(input.address, 300);
  const deliveryArea = cleanText(input.deliveryArea, 40);
  const notes = cleanText(input.notes, 600);
  const orderType = cleanText(input.orderType, 20).toLowerCase();
  const payment = cleanText(input.payment, 20).toLowerCase();
  const fulfillmentTiming =
    cleanText(input.fulfillmentTiming, 20) === "scheduled"
      ? "scheduled"
      : "asap";
  const gcashReference =
    payment === "gcash" ? cleanText(input.gcashReference, 20).replace(/\s+/g, "") : "";
  const gcashSenderName =
    payment === "gcash" ? cleanText(input.gcashSenderName, 120) : "";
  const gcashPaymentNote =
    payment === "gcash" ? cleanText(input.gcashPaymentNote, 300) : "";
  const gcashPaidAt = input.gcashPaidAt ? new Date(input.gcashPaidAt) : null;

  if (!customer || !phone || (orderType === "delivery" && !address))
    throw businessError(
      "Complete the customer and delivery details first.",
      "invalid-argument",
    );
  if (!ORDER_TYPES.has(orderType))
    throw businessError("Choose pickup or delivery.", "invalid-argument");
  if (!PAYMENT_METHODS.has(payment))
    throw businessError("Choose Cash or GCash.", "invalid-argument");
  if (orderType === "delivery" && !DELIVERY_AREAS.has(deliveryArea))
    throw businessError(
      "Delivery is currently available only in Taytay and Cainta.",
      "invalid-argument",
    );
  if (gcashReference && !/^\d{8,20}$/.test(gcashReference))
    throw businessError(
      "GCash reference number must contain 8 to 20 digits.",
      "invalid-argument",
    );
  if (
    payment === "gcash" &&
    (gcashReference || gcashSenderName || gcashPaidAt) &&
    (!gcashReference || !gcashSenderName || !gcashPaidAt || Number.isNaN(gcashPaidAt.getTime()))
  )
    throw businessError(
      "Enter the GCash reference, sender name, and payment time together.",
      "invalid-argument",
    );

  const orderRef = db.collection("orders").doc();
  const productRefs = [...quantities.keys()].map((id) =>
    db.doc(`products/${id}`),
  );
  const settingsRef = db.doc("settings/store");
  let createdOrder;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshots = await Promise.all([
        ...productRefs.map((productRef) => transaction.get(productRef)),
        transaction.get(settingsRef),
      ]);
      const settingsSnapshot = snapshots.pop();
      const storeSettings = settingsSnapshot.exists ? settingsSnapshot.data() : {};
      const scheduledFor = validateSchedule(
        storeSettings,
        fulfillmentTiming,
        input.scheduledFor,
      );
      const productSnapshots = snapshots;
      const items = productSnapshots.map((snapshot, index) => {
        const productId = productRefs[index].id;
        const quantity = quantities.get(productId);
        if (!snapshot.exists)
          throw businessError("A product in your cart no longer exists.");
        const product = snapshot.data();
        const price = Number(product.price);
        const stock = Number(product.stock);
        if (
          product.archived === true ||
          product.available === false ||
          !Number.isFinite(price) ||
          price < 0 ||
          !Number.isSafeInteger(stock) ||
          stock < quantity
        )
          throw businessError(
            "One or more items are no longer available in the requested quantity. Please review your cart.",
          );
        return {
          id: productId,
          name: cleanText(product.name, 120),
          supplier: cleanText(product.supplier, 120),
          category: cleanText(product.category, 120),
          image: cleanText(product.image, 2000),
          price,
          quantity,
        };
      });

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const configuredFee = Number(
        settingsSnapshot.exists ? storeSettings.deliveryFee : 20,
      );
      const deliveryFee =
        orderType === "delivery" && Number.isSafeInteger(configuredFee)
          ? Math.max(0, configuredFee)
          : 0;
      const timestamp = new Date().toISOString();
      createdOrder = {
        id: orderRef.id,
        customerId: request.auth.uid,
        customer,
        phone,
        email,
        address: orderType === "delivery" ? address : "",
        deliveryArea: orderType === "delivery" ? deliveryArea : "",
        notes,
        orderType,
        payment,
        paymentStatus:
          payment === "gcash" ? "Pending Verification" : "Not Required",
        paymentVerifiedAt: null,
        paymentVerifiedBy: null,
        gcashReference,
        gcashSenderName,
        gcashPaidAt: gcashPaidAt?.toISOString() || null,
        gcashPaymentNote,
        paymentSubmittedAt: gcashReference ? timestamp : null,
        fulfillmentTiming,
        scheduledFor,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        items,
        number: `TM-${orderRef.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`,
        status: "Pending",
        createdAt: timestamp,
        updatedAt: timestamp,
        inventoryDeductedAt: null,
        statusHistory: [
          {
            status: "Pending",
            at: timestamp,
            actorId: request.auth.uid,
            actorName: customer,
            actorRole: "customer",
          },
        ],
      };
      transaction.create(orderRef, createdOrder);
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("createOrder failed", error);
    throw businessError("Unable to place your order.", "internal");
  }

  return { order: createdOrder };
});

exports.updateOrderStatus = onCall(callableOptions, async (request) => {
  if (!request.auth)
    throw businessError("Sign in before updating an order.", "unauthenticated");
  const actor = await requireActiveProfile(request.auth.uid, ["staff", "owner"]);

  const orderId = cleanText(request.data?.orderId, 128);
  const requestedStatus = cleanText(request.data?.status, 40);
  if (!orderId || orderId.includes("/") || !ORDER_STATUSES.has(requestedStatus))
    throw businessError("That order status is not valid.", "invalid-argument");

  try {
    await db.runTransaction(async (transaction) => {
      const orderRef = db.doc(`orders/${orderId}`);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) throw businessError("Order not found.", "not-found");
      const order = orderSnapshot.data();
      if (!nextStatuses(order).has(requestedStatus))
        throw businessError(
          `Move this order to its next ${order.orderType === "delivery" ? "delivery" : "pickup"} status first.`,
        );

      const timestamp = new Date().toISOString();
      const statusEntry = {
        status: requestedStatus,
        at: timestamp,
        actorId: request.auth.uid,
        actorName: cleanText(actor.name, 120) || actor.role,
        actorRole: actor.role,
      };
      const history = Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [];
      const changes = {
        status: requestedStatus,
        updatedAt: timestamp,
        statusHistory:
          order.status === requestedStatus ? history : [...history, statusEntry],
      };
      if (requestedStatus === "Completed" && !order.inventoryDeductedAt) {
        const quantities = normalizeCartItems(order.items);
        const productRefs = [...quantities.keys()].map((id) =>
          db.doc(`products/${id}`),
        );
        const productSnapshots = await Promise.all(
          productRefs.map((productRef) => transaction.get(productRef)),
        );
        productSnapshots.forEach((snapshot, index) => {
          const quantity = quantities.get(productRefs[index].id);
          if (
            !snapshot.exists ||
            !Number.isSafeInteger(Number(snapshot.data().stock)) ||
            Number(snapshot.data().stock) < quantity
          )
            throw businessError(
              "A product no longer has enough finished-product stock to complete this order.",
            );
        });
        productSnapshots.forEach((snapshot, index) => {
          const productRef = productRefs[index];
          const product = snapshot.data();
          const stock = Number(product.stock) - quantities.get(productRef.id);
          transaction.update(productRef, {
            stock,
            available: stock > 0 ? product.available !== false : false,
            updatedAt: timestamp,
          });
          const movementRef = db.collection("inventoryMovements").doc();
          transaction.create(movementRef, {
            id: movementRef.id,
            productId: productRef.id,
            productName: cleanText(product.name, 120),
            supplier: cleanText(product.supplier, 120),
            type: "order_deduction",
            quantity: -quantities.get(productRef.id),
            beforeStock: Number(product.stock),
            afterStock: stock,
            orderId,
            orderNumber: cleanText(order.number, 80),
            reason: `Completed order ${cleanText(order.number, 80)}`,
            actorId: request.auth.uid,
            actorName: cleanText(actor.name, 120) || actor.role,
            actorRole: actor.role,
            createdAt: timestamp,
          });
        });
        changes.inventoryDeductedAt = timestamp;
      }
      transaction.update(orderRef, changes);
      const auditRef = db.collection("auditLogs").doc();
      transaction.create(auditRef, {
        id: auditRef.id,
        action: "update_order_status",
        entityType: "order",
        entityId: orderId,
        summary: `Updated ${cleanText(order.number, 80)} to ${requestedStatus}.`,
        actorId: request.auth.uid,
        actorName: cleanText(actor.name, 120) || actor.role,
        actorRole: actor.role,
        createdAt: timestamp,
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("updateOrderStatus failed", { orderId, error });
    throw businessError("Unable to update this order.", "internal");
  }

  return { ok: true };
});

exports.updatePaymentStatus = onCall(callableOptions, async (request) => {
  if (!request.auth)
    throw businessError("Sign in before updating a payment.", "unauthenticated");
  const actor = await requireActiveProfile(request.auth.uid, ["staff", "owner"]);

  const orderId = cleanText(request.data?.orderId, 128);
  const paymentStatus = cleanText(request.data?.paymentStatus, 40);
  if (
    !orderId ||
    orderId.includes("/") ||
    !["Pending Verification", "Verified"].includes(paymentStatus)
  )
    throw businessError("That payment status is not valid.", "invalid-argument");

  try {
    await db.runTransaction(async (transaction) => {
      const orderRef = db.doc(`orders/${orderId}`);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists)
        throw businessError("Order not found.", "not-found");
      if (orderSnapshot.data().payment !== "gcash")
        throw businessError(
          "Only GCash orders need manual payment verification.",
        );
      const timestamp = new Date().toISOString();
      transaction.update(orderRef, {
        paymentStatus,
        paymentVerifiedAt: paymentStatus === "Verified" ? timestamp : null,
        paymentVerifiedBy:
          paymentStatus === "Verified" ? request.auth.uid : null,
        updatedAt: timestamp,
      });
      const auditRef = db.collection("auditLogs").doc();
      transaction.create(auditRef, {
        id: auditRef.id,
        action:
          paymentStatus === "Verified" ? "verify_payment" : "reopen_payment",
        entityType: "payment",
        entityId: orderId,
        summary: `${cleanText(orderSnapshot.data().number, 80)} payment marked ${paymentStatus.toLowerCase()}.`,
        actorId: request.auth.uid,
        actorName: cleanText(actor.name, 120) || actor.role,
        actorRole: actor.role,
        createdAt: timestamp,
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("updatePaymentStatus failed", { orderId, error });
    throw businessError("Unable to update this payment.", "internal");
  }

  return { ok: true };
});
