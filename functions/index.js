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
        settingsSnapshot.exists ? settingsSnapshot.data().deliveryFee : 20,
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
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        items,
        number: `TM-${orderRef.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`,
        status: "Pending",
        createdAt: timestamp,
        updatedAt: timestamp,
        inventoryDeductedAt: null,
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
  await requireActiveProfile(request.auth.uid, ["staff", "owner"]);

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
      const changes = { status: requestedStatus, updatedAt: timestamp };
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
        });
        changes.inventoryDeductedAt = timestamp;
      }
      transaction.update(orderRef, changes);
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("updateOrderStatus failed", { orderId, error });
    throw businessError("Unable to update this order.", "internal");
  }

  return { ok: true };
});
