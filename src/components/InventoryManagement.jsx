import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrdersContext";
import { useShop } from "../context/ShopContext";
import { prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import Modal from "./Modal";

export default function InventoryManagement({ role = "owner" }) {
  const { products, lowStockLimit, updateProduct } = useProducts();
  const { orders } = useOrders();
  const { notify } = useShop();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(5);
  const active = products.filter((product) => !product.archived);
  const stateFor = (product) =>
    product.stock === 0
      ? "out"
      : !product.available
        ? "unavailable"
        : product.stock <= lowStockLimit
          ? "low"
          : "available";
  const labels = {
    available: "Available",
    low: "Low stock",
    out: "Out of stock",
    unavailable: "Unavailable",
  };
  const visible = active.filter(
    (product) =>
      (filter === "all" || stateFor(product) === filter) &&
      (product.name + " " + product.supplier + " " + product.id)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const history = orders
    .filter((order) => order.inventoryDeductedAt)
    .sort(
      (a, b) =>
        new Date(b.inventoryDeductedAt) - new Date(a.inventoryDeductedAt),
    )
    .flatMap((order) =>
      order.items.map((item) => ({
        ...item,
        key: order.id + "-" + item.id,
        order: order.number,
        at: order.inventoryDeductedAt,
      })),
    )
    .slice(0, 8);
  const current = products.find((product) => product.id === selected);
  const restock = async (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!current || !Number.isInteger(amount) || amount < 1) return;
    const result = await updateProduct(current.id, (product) => ({
      stock: product.stock + amount,
      available: product.stock === 0 ? true : product.available,
    }));
    notify(result.ok ? amount + " units added to " + current.name + "." : result.error);
    if (result.ok) setSelected(null);
  };
  return (
    <DashboardLayout role={role === "staff" ? "Staff" : "Owner / Admin"}>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Freshly made. Carefully counted.</p>
          <h1>Inventory</h1>
          <p>
            {role === "staff"
              ? "Monitor availability and let the owner know when stock is running low."
              : "Manage finished meals and bakery products. No ingredient tracking."}
          </p>
        </div>
        {role === "owner" && (
          <a className="btn-brand" href="#products">
            <Icon name="edit" size={17} />
            Manage Products
          </a>
        )}
      </header>
      <div className="metric-grid">
        {[
          [
            "Healthy Stock",
            active.filter((product) => stateFor(product) === "available")
              .length,
            "Products above " + lowStockLimit + " units",
            "completed",
          ],
          [
            "Low Stock",
            active.filter(
              (product) => product.stock > 0 && product.stock <= lowStockLimit,
            ).length,
            lowStockLimit + " units or fewer",
            "warning",
          ],
          [
            "Out of Stock",
            active.filter((product) => product.stock === 0).length,
            "Unavailable for new orders",
            "inventory",
          ],
          [
            "Units on Hand",
            active.reduce((sum, product) => sum + product.stock, 0),
            "Across all active products",
            "store",
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
      <section className="simple-card">
        <header className="table-toolbar">
          <h2>Current Stock</h2>
          <div className="product-table-filters">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                aria-label="Search inventory"
                placeholder="Search products or supplier..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter inventory"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All active products</option>
              {Object.entries(labels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </header>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Current finished-product stock"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Updated</th>
                {role === "owner" && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product">
                      <img src={product.image} alt="" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>{product.supplier}</td>
                  <td>
                    <strong>{product.stock}</strong> units
                  </td>
                  <td>
                    <span className={"stock-status " + stateFor(product)}>
                      {labels[stateFor(product)]}
                    </span>
                  </td>
                  <td>{prettyDate(product.updatedAt)}</td>
                  {role === "owner" && (
                    <td>
                      <button
                        className="btn-secondary table-view"
                        onClick={() => {
                          setSelected(product.id);
                          setQuantity(5);
                        }}
                        aria-label={
                          "Restock " +
                          product.name +
                          " from " +
                          product.supplier
                        }
                      >
                        <Icon name="plus" size={14} />
                        Restock
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="dashboard-empty">
            <Icon name="inventory" size={36} />
            <p>No products match this filter.</p>
          </div>
        )}
        <p className="table-footer">
          Pending, Confirmed, Preparing, Ready for Pickup, and Out for Delivery
          orders do not deduct stock.
        </p>
      </section>
      <section className="simple-card inventory-ledger">
        <header className="table-toolbar">
          <h2>Order Stock Deductions</h2>
          <span className="period-label">Most recent completed orders</span>
        </header>
        {history.length ? (
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
                  <th>Supplier</th>
                  <th>Order</th>
                  <th>Change</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.key}>
                    <td>{entry.name}</td>
                    <td>{entry.supplier}</td>
                    <td>{entry.order}</td>
                    <td>−{entry.quantity}</td>
                    <td>{prettyDate(entry.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <Icon name="inventory" size={32} />
            <p>Stock deductions will appear after the first completed order.</p>
          </div>
        )}
      </section>
      {current && role === "owner" && (
        <Modal title="Restock Product" onClose={() => setSelected(null)}>
          <form onSubmit={restock}>
            <div className="table-product">
              <img src={current.image} alt="" />
              <span>
                <strong>{current.name}</strong>
                <small>
                  {current.supplier} · {current.stock} on hand
                </small>
              </span>
            </div>
            <label>
              Quantity to add
              <input
                autoFocus
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <p className="table-footer">
              New stock: {current.stock + (Number(quantity) || 0)} units. A
              sold-out product becomes available after restocking.
            </p>
            <button className="btn-brand full-button">
              Add Stock <Icon name="plus" size={17} />
            </button>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
