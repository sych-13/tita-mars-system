import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrdersContext";
import { useShop } from "../context/ShopContext";
import { prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import Modal from "./Modal";
import { useHashRoute } from "../hooks/useHashRoute";

export default function InventoryManagement({ role = "owner" }) {
  const { products, lowStockLimit, inventoryMovements, restockProduct } =
    useProducts();
  const { orders } = useOrders();
  const { notify } = useShop();
  const { params } = useHashRoute();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(5);
  const [reason, setReason] = useState("New finished-product stock received");
  useEffect(() => {
    if (params.product) setQuery(params.product);
  }, [params.product]);
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
  const legacyHistory = orders
    .filter((order) => order.inventoryDeductedAt)
    .flatMap((order) =>
      order.items.map((item, index) => ({
        id: `legacy-${order.id}-${item.id}-${index}`,
        productName: item.name,
        supplier: item.supplier,
        type: "order_deduction",
        quantity: -item.quantity,
        beforeStock: null,
        afterStock: null,
        orderNumber: order.number,
        reason: `Completed order ${order.number}`,
        actorName: "System",
        createdAt: order.inventoryDeductedAt,
      })),
    );
  const history = (inventoryMovements.length
    ? inventoryMovements
    : legacyHistory
  ).slice(0, 30);
  const current = products.find((product) => product.id === selected);
  const restock = async (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (
      !current ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 100000 ||
      !Number.isSafeInteger(current.stock + amount)
    ) {
      notify("Enter a restock quantity from 1 to 100,000.");
      return;
    }
    const result = await restockProduct(current.id, amount, reason);
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
              ? "Monitor availability and record newly received finished-product stock."
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
                <th>Action</th>
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
                  <td>
                    <button
                      className="btn-secondary table-view"
                      onClick={() => {
                        setSelected(product.id);
                        setQuantity(5);
                        setReason("New finished-product stock received");
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
          <h2>Inventory Movement History</h2>
          <span className="period-label">Restocks, adjustments, and deductions</span>
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
                  <th>Reason</th>
                  <th>Change</th>
                  <th>Balance</th>
                  <th>Recorded by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.productName}</td>
                    <td>{entry.supplier}</td>
                    <td>{entry.reason || entry.orderNumber || "Stock adjustment"}</td>
                    <td
                      className={
                        entry.quantity > 0
                          ? "movement-positive"
                          : "movement-negative"
                      }
                    >
                      {entry.quantity > 0 ? "+" : ""}
                      {entry.quantity}
                    </td>
                    <td>
                      {entry.afterStock === null
                        ? "Legacy record"
                        : `${entry.beforeStock} → ${entry.afterStock}`}
                    </td>
                    <td>{entry.actorName || "System"}</td>
                    <td>{prettyDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <Icon name="inventory" size={32} />
            <p>Inventory changes will appear after a restock or completed order.</p>
          </div>
        )}
      </section>
      {current && (
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
                max="100000"
                step="1"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label>
              Reason
              <input
                value={reason}
                maxLength="300"
                required
                onChange={(event) => setReason(event.target.value)}
                placeholder="Example: Supplier delivery received"
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
