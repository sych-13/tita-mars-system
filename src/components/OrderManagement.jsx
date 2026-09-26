import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  orderStatuses,
  statusesForOrder,
  useOrders,
} from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { useShop } from "../context/ShopContext";
import { useHashRoute } from "../hooks/useHashRoute";
import OrderStatusBadge from "./OrderStatusBadge";
import Modal from "./Modal";
import Icon from "./Icon";
import { peso, prettyDate } from "../utils/formatters";
export default function OrderManagement({ role = "owner" }) {
  const { orders, updateOrderStatus } = useOrders();
  const { products } = useProducts();
  const { notify } = useShop();
  const { params, navigate } = useHashRoute();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const visible = orders.filter(
    (o) =>
      (filter === "All" || o.status === filter) &&
      `${o.number} ${o.customer} ${o.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const current = orders.find((o) => o.id === params.order);
  useEffect(() => {
    setStatus(current?.status || "");
  }, [current?.id, current?.status]);
  const close = () => navigate("manage-orders");
  const open = (o) => {
    setStatus(o.status);
    navigate("manage-orders", { order: o.id });
  };
  const update = async () => {
    const next = status || current.status;
    setUpdating(true);
    const result = await updateOrderStatus(current.id, next);
    setUpdating(false);
    notify(result.ok ? `${current.number} updated to ${next}.` : result.error);
    if (result.ok) close();
  };
  return (
    <DashboardLayout role={role === "staff" ? "Staff" : "Owner / Admin"}>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">From our kitchen to their table</p>
          <h1>Manage Orders</h1>
          <p>Keep every order moving, one delicious meal at a time.</p>
        </div>
        <span className="period-label">{orders.length} total orders</span>
      </header>
      <section className="simple-card">
        <div className="order-filter-tabs">
          {["All", "Pending", "Preparing", "Ready for Pickup", "Completed"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={s === filter ? "selected" : ""}
                aria-pressed={s === filter}
              >
                {s === "Ready for Pickup" ? "Ready" : s}
              </button>
            ),
          )}
        </div>
        <div className="table-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search orders"
              placeholder="Search order or customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter order status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            {orderStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Scrollable data table"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.number}</strong>
                  </td>
                  <td>{o.customer}</td>
                  <td>{o.orderType === "pickup" ? "Pickup" : "Delivery"}</td>
                  <td>{peso.format(o.total)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td>
                    <button
                      className="btn-secondary table-view"
                      onClick={() => open(o)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="dashboard-empty">
            <Icon name="orders" size={40} />
            <h3>No orders found</h3>
            <p>Try another filter, or wait for your next customer order.</p>
          </div>
        )}
      </section>
      {current && (
        <Modal title="Update Order Status" onClose={close}>
          <div className="order-modal-title">
            <strong>Order #{current.number}</strong>
            <OrderStatusBadge status={current.status} />
          </div>
          <p className="order-modal-date">{prettyDate(current.createdAt)}</p>
          {current.items.map((i) => (
            <div className="checkout-summary-item" key={i.id}>
              <img
                src={products.find((p) => p.id === i.id)?.image || i.image}
                alt=""
              />
              <span>
                {i.name} × {i.quantity}
                <small>{i.supplier}</small>
              </span>
              <strong>{peso.format(i.price * i.quantity)}</strong>
            </div>
          ))}
          <div className="summary-row">
            <span>Delivery fee</span>
            <strong>{peso.format(current.deliveryFee || 0)}</strong>
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <strong>{peso.format(current.total)}</strong>
          </div>
          <div className="order-contact">
            <strong>{current.customer}</strong>
            <p>
              {current.phone} {current.email && "· " + current.email}
            </p>
            <p>
              {current.orderType === "delivery"
                ? current.address + " · " + (current.deliveryArea || "")
                : "Pickup at Tita Mars"}{" "}
              · {current.payment === "cash" ? "Cash" : "GCash"}
            </p>
            {current.notes && <p>Notes: {current.notes}</p>}
          </div>
          <label>
            Status
            <select
              value={status || current.status}
              disabled={current.status === "Completed"}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusesForOrder(current).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {status === "Completed" && current.status !== "Completed" && (
            <p className="completion-note">
              <Icon name="inventory" size={17} />
              Completing this order deducts stock once and locks its status.
            </p>
          )}
          {current.status === "Completed" ? (
            <p className="completion-note">
              <Icon name="check" size={17} />
              Completed · Stock recorded{" "}
              {current.inventoryDeductedAt
                ? prettyDate(current.inventoryDeductedAt)
                : "in legacy records"}
            </p>
          ) : (
            <button
              className="btn-brand full-button"
              style={{ marginTop: 17 }}
              onClick={update}
              disabled={updating}
            >
              {updating ? "Updating…" : "Update Status"} <Icon name="check" size={17} />
            </button>
          )}
        </Modal>
      )}
    </DashboardLayout>
  );
}
