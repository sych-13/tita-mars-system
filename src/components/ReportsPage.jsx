import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { peso, prettyDate } from "../utils/formatters";
import SalesChart from "./SalesChart";
import Icon from "./Icon";
export default function ReportsPage({ role = "owner" }) {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [period, setPeriod] = useState("all");
  const today = new Date();
  const localDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [from, setFrom] = useState(() =>
    localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [to, setTo] = useState(() => localDate(today));
  const dateFor = (o) =>
    new Date(o.inventoryDeductedAt || o.updatedAt || o.createdAt);
  const customStart = from ? new Date(`${from}T00:00:00`) : null;
  const customEnd = to ? new Date(`${to}T23:59:59.999`) : null;
  const complete = orders
    .filter((o) => {
      if (o.status !== "Completed") return false;
      const date = dateFor(o);
      if (Number.isNaN(date.getTime())) return false;
      if (period === "all") return true;
      if (period === "today")
        return date.toDateString() === new Date().toDateString();
      if (period === "week")
        return Date.now() - date.getTime() < 7 * 86400000;
      if (period === "month")
        return (
          date.getMonth() === new Date().getMonth() &&
          date.getFullYear() === new Date().getFullYear()
        );
      return (
        period === "custom" &&
        customStart &&
        customEnd &&
        customStart <= customEnd &&
        date >= customStart &&
        date <= customEnd
      );
    })
    .sort((a, b) => dateFor(b) - dateFor(a));
  const periodLabels = {
    all: "All time",
    today: "Today",
    week: "Last 7 days",
    month: "This month",
    custom: from && to ? `${from} to ${to}` : "Custom dates",
  };
  const revenue = complete.reduce((sum, o) => sum + Number(o.total), 0);
  const customers = new Set(
    complete.map((o) => o.customerId || o.phone || o.customer),
  ).size;
  const sold = {};
  complete.forEach((o) =>
    o.items.forEach((i) => {
      sold[i.id] = {
        ...i,
        quantity: (sold[i.id]?.quantity || 0) + i.quantity,
        revenue: (sold[i.id]?.revenue || 0) + i.price * i.quantity,
      };
    }),
  );
  const best = Object.values(sold)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const exportReport = () => {
    const safeCell = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = [
      [
        "Completed",
        "Order Number",
        "Customer",
        "Fulfillment",
        "Payment",
        "Subtotal",
        "Delivery Fee",
        "Total",
      ],
      ...complete.map((order) => [
        dateFor(order).toISOString(),
        order.number,
        order.customer,
        order.orderType === "pickup" ? "Pickup" : "Delivery",
        order.payment === "gcash" ? "GCash" : "Cash",
        Number(order.subtotal || 0),
        Number(order.deliveryFee || 0),
        Number(order.total || 0),
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map(safeCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tita-mars-sales-${period}-${localDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <DashboardLayout role={role === "staff" ? "Staff" : "Owner / Admin"}>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">The bigger picture</p>
          <h1>{role === "staff" ? "Daily Sales" : "Sales Report"}</h1>
          <p>A closer look at your sales and customer favorites.</p>
        </div>
        <div className="report-controls">
          <select
            aria-label="Report period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="custom">Custom dates</option>
          </select>
          <button
            type="button"
            className="btn-secondary"
            onClick={exportReport}
            disabled={!complete.length}
          >
            <Icon name="download" size={17} /> Export CSV
          </button>
        </div>
      </header>
      {period === "custom" && (
        <section className="simple-card custom-date-filter">
          <label>
            Start date
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={localDate(new Date())}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <span className="period-label">
            {complete.length} completed order{complete.length === 1 ? "" : "s"}
          </span>
        </section>
      )}
      <div className="metric-grid">
        {[
          ["Total Sales", peso.format(revenue), "cash"],
          ["Total Orders", complete.length, "cart"],
          ["Customers", customers, "users"],
          [
            "Average Order",
            peso.format(complete.length ? revenue / complete.length : 0),
            "chart",
          ],
        ].map(([label, value, icon]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Completed orders</small>
            <Icon name={icon} size={25} />
          </article>
        ))}
      </div>
      <div className="dashboard-chart-grid">
        <section className="simple-card">
          <header className="table-toolbar">
            <h2>Sales Overview</h2>
            <span className="period-label">Recent 7-day trend</span>
          </header>
          <SalesChart orders={complete} line={role !== "staff"} />
        </section>
        <section className="simple-card">
          <h2>Best Selling Products</h2>
          {best.length ? (
            <div className="top-products">
              {best.map((p) => (
                <article key={p.id}>
                  <img
                    src={products.find((x) => x.id === p.id)?.image || p.image}
                    alt=""
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.supplier}</small>
                  </span>
                  <div>
                    <b>{p.quantity} sold</b>
                    <small>{peso.format(p.revenue)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <Icon name="chart" size={35} />
              <p>Complete an order to see your best sellers.</p>
            </div>
          )}
        </section>
      </div>
      <section className="simple-card report-orders-table">
        <header className="table-toolbar">
          <h2>Completed Orders</h2>
          <span className="period-label">{periodLabels[period]}</span>
        </header>
        {complete.length ? (
          <div
            className="table-scroll"
            tabIndex="0"
            role="region"
            aria-label="Completed orders in this report"
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Completed</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {complete.map((order) => (
                  <tr key={order.id}>
                    <td>{prettyDate(dateFor(order))}</td>
                    <td>{order.number}</td>
                    <td>{order.customer}</td>
                    <td>
                      {order.orderType === "pickup" ? "Pickup" : "Delivery"}
                    </td>
                    <td>{order.payment === "gcash" ? "GCash" : "Cash"}</td>
                    <td>
                      <strong>{peso.format(order.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <Icon name="chart" size={34} />
            <p>No completed orders in this date range.</p>
          </div>
        )}
      </section>
      <section className="simple-card">
        <h2>Sales by Supplier</h2>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Scrollable data table"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Units sold</th>
                <th>Product sales</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Tita Mars Eatery",
                "Ribbonette's Bakeshoppe",
                "Gabbis Bakeshop",
              ].map((supplier) => {
                const items = Object.values(sold).filter(
                  (i) => i.supplier === supplier,
                );
                return (
                  <tr key={supplier}>
                    <td>{supplier}</td>
                    <td>{items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td>
                      {peso.format(items.reduce((s, i) => s + i.revenue, 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-footer">
          Product sales exclude delivery fees. Total sales include fees on
          completed orders.
        </p>
      </section>
    </DashboardLayout>
  );
}
