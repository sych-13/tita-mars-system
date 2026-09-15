export const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export const prettyDate = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const orderStatusMeta = {
  Pending: { icon: "fa-clock", tone: "pending" },
  Confirmed: { icon: "fa-circle-check", tone: "confirmed" },
  Preparing: { icon: "fa-utensils", tone: "preparing" },
  "Ready for Pickup": { icon: "fa-bag-shopping", tone: "ready" },
  "Out for Delivery": { icon: "fa-motorcycle", tone: "delivery" },
  Completed: { icon: "fa-circle-check", tone: "completed" },
  Cancelled: { icon: "fa-circle-xmark", tone: "cancelled" },
};

export const isActiveOrder = (status) =>
  !["Completed", "Cancelled"].includes(status);
