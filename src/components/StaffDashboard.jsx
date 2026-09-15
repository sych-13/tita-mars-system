import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { useSession } from "../context/SessionContext";
import OrderStatusBadge from "./OrderStatusBadge";
import Icon from "./Icon";
import { peso } from "../utils/formatters";

export default function StaffDashboard() {
  const { orders } = useOrders();
  const { products, lowStockLimit } = useProducts();
  const { user } = useSession();
  const [filter, setFilter] = useState("New Orders");
  const isActive = (order) =>
    !["Completed", "Cancelled"].includes(order.status);
  const groups = {
    "New Orders": orders.filter((order) => order.status === "Pending"),
    "In Progress": orders.filter(
      (order) => isActive(order) && order.status !== "Pending",
    ),
    Completed: orders.filter((order) => order.status === "Completed"),
  };
  const visible = groups[filter];
  const activeProducts = products.filter((product) => !product.archived);
  const lowStock = activeProducts.filter(
    (product) => product.stock <= lowStockLimit,
  );
  const available = activeProducts.filter(
    (product) => product.available && product.stock > 0,
  );
  return (
    <DashboardLayout role="Staff">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            Welcome back{user ? ", " + user.name.split(" ")[0] : ""}
          </p>
          <h1>Today’s Operations</h1>
          <p>A little care in every order. Let’s keep the kitchen moving.</p>
        </div>
        <a href="#manage-orders" className="btn-brand">
          View Orders <Icon name="arrow" size={17} />
        </a>
      </header>
      <div className="metric-grid">
        {[
          [
            "New Orders",
            groups["New Orders"].length,
            "Waiting for confirmation",
            "pending",
          ],
          [
            "In Progress",
            groups["In Progress"].length,
            "Being prepared or fulfilled",
            "preparing",
          ],
          [
            "Completed",
            groups.Completed.length,
            "Successfully fulfilled orders",
            "completed",
          ],
          [
            "Available Products",
            available.length,
            "Ready to order",
            "inventory",
          ],
        ].map(([label, value, copy, icon]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{copy}</small>
            <Icon name={icon} size={27} />
          </article>
        ))}
      </div>
      <div className="operations-grid">
        <section className="simple-card">
          <header className="table-toolbar">
            <h2>Order Queue</h2>
            <span className="period-label">
              {orders.filter(isActive).length} active orders
            </span>
          </header>
          <div className="order-filter-tabs">
            {Object.entries(groups).map(([name, group]) => (
              <button
                key={name}
                onClick={() => setFilter(name)}
                aria-pressed={filter === name}
                className={filter === name ? "selected" : ""}
              >
                {name} <span>{group.length}</span>
              </button>
            ))}
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
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.number}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td>{peso.format(order.total)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>
                      <a
                        className="table-view"
                        href={"#manage-orders?order=" + order.id}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <div className="dashboard-empty">
              <Icon name="orders" size={36} />
              <h3>
                {filter === "New Orders"
                  ? "All caught up!"
                  : "No orders here yet"}
              </h3>
              <p>
                {filter === "New Orders"
                  ? "New customer orders will appear here."
                  : "Orders appear here as their status changes."}
              </p>
            </div>
          )}
        </section>
        <aside className="simple-card">
          <header className="table-toolbar">
            <h2>Inventory Watch</h2>
            <a href="#inventory" className="text-link">
              View All <Icon name="arrow" size={14} />
            </a>
          </header>
          <p>
            Finished products only. Stock is deducted once, when an order is
            Completed.
          </p>
          <div
            className="table-scroll"
            tabIndex="0"
            role="region"
            aria-label="Scrollable data table"
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(lowStock.length ? lowStock : activeProducts)
                  .slice(0, 5)
                  .map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <small className="cell-detail">
                          {product.supplier}
                        </small>
                      </td>
                      <td>{product.stock}</td>
                      <td>
                        <span
                          className={
                            "stock-status " +
                            (product.stock === 0
                              ? "out"
                              : !product.available
                                ? "unavailable"
                                : product.stock <= lowStockLimit
                                  ? "low"
                                  : "available")
                          }
                        >
                          {product.stock === 0
                            ? "Out of stock"
                            : !product.available
                              ? "Unavailable"
                              : product.stock <= lowStockLimit
                                ? "Low stock"
                                : "Available"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="table-footer">
            {lowStock.length
              ? lowStock.length + " products need a stock check."
              : "No low-stock alerts. Looking good!"}
          </p>
        </aside>
      </div>
    </DashboardLayout>
  );
}
