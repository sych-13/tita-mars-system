export const orderStatuses = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

export const paymentStatuses = [
  "Not Required",
  "Pending Verification",
  "Verified",
];

export const paymentStatusForOrder = (order) => {
  if (order?.payment !== "gcash") return "Not Required";
  return order?.paymentStatus === "Verified"
    ? "Verified"
    : "Pending Verification";
};

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

export const statusChangesForOrder = (order) => {
  const current = order?.status || "Pending";
  const nextByStatus = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Preparing", "Cancelled"],
    Preparing:
      order?.orderType === "delivery"
        ? ["Out for Delivery", "Cancelled"]
        : ["Ready for Pickup", "Cancelled"],
    "Ready for Pickup": ["Completed", "Cancelled"],
    "Out for Delivery": ["Completed", "Cancelled"],
    Completed: [],
    Cancelled: [],
  };
  return [current, ...(nextByStatus[current] || [])];
};

export function summarizeOrderItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50)
    return { ok: false };

  const quantities = new Map();
  for (const item of items) {
    if (
      typeof item?.id !== "string" ||
      !item.id ||
      item.id.includes("/") ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 1000
    )
      return { ok: false };
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }

  return { ok: true, quantities };
}
