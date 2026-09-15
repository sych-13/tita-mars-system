import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { peso } from "../utils/formatters";
import SalesChart from "./SalesChart";
import Icon from "./Icon";
export default function ReportsPage({ role = "owner" }) {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [period, setPeriod] = useState("all");
  const dateFor = (o) =>
    new Date(o.inventoryDeductedAt || o.updatedAt || o.createdAt);
  const complete = orders.filter(
    (o) =>
      o.status === "Completed" &&
      (period === "all" ||
        (period === "today" &&
          dateFor(o).toDateString() === new Date().toDateString()) ||
        (period === "week" &&
          Date.now() - dateFor(o).getTime() < 7 * 86400000) ||
        (period === "month" &&
          dateFor(o).getMonth() === new Date().getMonth() &&
          dateFor(o).getFullYear() === new Date().getFullYear())),
  );
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
  return (
    <DashboardLayout role={role === "staff" ? "Staff" : "Owner / Admin"}>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">The bigger picture</p>
          <h1>{role === "staff" ? "Daily Sales" : "Sales Report"}</h1>
          <p>A closer look at your sales and customer favorites.</p>
        </div>
        <select
          aria-label="Report period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">This month</option>
        </select>
      </header>
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
            <span className="period-label">Last 7 days</span>
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
