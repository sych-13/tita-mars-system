import { useEffect, useMemo, useState } from "react";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { useSession } from "../context/SessionContext";
import Icon from "./Icon";

const readKey = (user, role) =>
  `tita-mars-notifications-read-${user?.id || role}`;

const readSaved = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function NotificationCenter({ compact = false }) {
  const { orders } = useOrders();
  const { products, lowStockLimit } = useProducts();
  const { user, role } = useSession();
  const storageKey = readKey(user, role);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => readSaved(storageKey));

  useEffect(() => {
    setReadIds(readSaved(storageKey));
    setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    const close = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const notifications = useMemo(() => {
    const next = [];
    if (["staff", "owner"].includes(role)) {
      orders.forEach((order) => {
        if (order.status === "Pending")
          next.push({
            id: `new-${order.id}`,
            title: `New order ${order.number}`,
            copy: `${order.customer} placed a ${order.orderType} order.`,
            at: order.createdAt,
            href: `#manage-orders?order=${order.id}`,
            icon: "orders",
          });
        if (
          order.payment === "gcash" &&
          order.paymentStatus === "Pending Verification"
        )
          next.push({
            id: `payment-${order.id}-${order.paymentSubmittedAt || "waiting"}`,
            title: `GCash verification ${order.number}`,
            copy: order.gcashReference
              ? `Reference ${order.gcashReference} is ready to check.`
              : "Waiting for the customer's payment reference.",
            at: order.paymentSubmittedAt || order.createdAt,
            href: `#manage-orders?order=${order.id}`,
            icon: "card",
          });
      });
      products
        .filter(
          (product) =>
            !product.archived && product.stock <= lowStockLimit,
        )
        .forEach((product) =>
          next.push({
            id: `stock-${product.id}-${product.stock}`,
            title:
              product.stock === 0
                ? `${product.name} is out of stock`
                : `${product.name} is low on stock`,
            copy: `${product.stock} unit${product.stock === 1 ? "" : "s"} remaining.`,
            at: product.updatedAt,
            href: `#inventory?product=${product.id}`,
            icon: product.stock === 0 ? "warning" : "inventory",
          }),
        );
    } else {
      orders
        .filter((order) =>
          user ? order.customerId === user.id : !order.customerId,
        )
        .forEach((order) => {
          next.push({
            id: `customer-${order.id}-${order.status}`,
            title: `${order.number}: ${order.status}`,
            copy:
              order.status === "Ready for Pickup"
                ? "Your order is ready. Show the pickup QR to staff."
                : "Open your order to see its latest progress.",
            at: order.updatedAt || order.createdAt,
            href: `#my-orders?order=${order.id}`,
            icon: order.status === "Completed" ? "completed" : "orders",
          });
          if (order.paymentStatus === "Verified")
            next.push({
              id: `customer-payment-${order.id}`,
              title: `${order.number}: Payment verified`,
              copy: "Tita Mars confirmed your GCash payment.",
              at: order.paymentVerifiedAt || order.updatedAt,
              href: `#my-orders?order=${order.id}`,
              icon: "check",
            });
        });
    }
    return next
      .filter((item) => item.at)
      .sort((left, right) => new Date(right.at) - new Date(left.at))
      .slice(0, 30);
  }, [lowStockLimit, orders, products, role, user]);

  const unread = notifications.filter((item) => !readIds.includes(item.id));
  const remember = (ids) => {
    const next = [...new Set([...readIds, ...ids])].slice(-200);
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <div className={`notification-center ${compact ? "compact" : ""}`}>
      <button
        type="button"
        className="icon-button notification-trigger"
        aria-label={`Notifications, ${unread.length} unread`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={21} />
        {unread.length > 0 && (
          <span className="notification-count">{Math.min(99, unread.length)}</span>
        )}
      </button>
      {open && (
        <section className="notification-panel" aria-label="Notifications">
          <header>
            <div>
              <strong>Notifications</strong>
              <small>{unread.length} unread</small>
            </div>
            {unread.length > 0 && (
              <button
                type="button"
                className="text-link"
                onClick={() => remember(notifications.map((item) => item.id))}
              >
                Mark all read
              </button>
            )}
          </header>
          <div className="notification-list">
            {notifications.length ? (
              notifications.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={readIds.includes(item.id) ? "read" : "unread"}
                  onClick={() => {
                    remember([item.id]);
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.copy}</small>
                  </span>
                </a>
              ))
            ) : (
              <p className="notification-empty">You are all caught up.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
