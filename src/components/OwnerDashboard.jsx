import DashboardLayout from "../layouts/DashboardLayout";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { peso, prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import SalesChart from "./SalesChart";
import OrderStatusBadge from "./OrderStatusBadge";
import { useSession } from "../context/SessionContext";
export default function OwnerDashboard() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { user } = useSession();
  const completed = orders.filter((o) => o.status === "Completed");
  const total = completed.reduce((s, o) => s + Number(o.total), 0);
  const customers = new Set(
    orders.map((o) => o.customerId || o.phone || o.customer),
  ).size;
  const sales = {};
  completed.forEach((o) =>
    o.items.forEach((item) => {
      sales[item.id] = {
        ...item,
        sold: (sales[item.id]?.sold || 0) + item.quantity,
      };
    }),
  );
  const top = Object.values(sales)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
  const exportOrders = () => {
    const escape = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      ["Order", "Customer", "Status", "Total", "Date"],
      ...orders.map((o) => [
        o.number,
        o.customer,
        o.status,
        o.total,
        o.createdAt,
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "tita-mars-orders.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <DashboardLayout>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            Welcome back{user ? ", " + user.name.split(" ")[0] : ""}
          </p>
          <h1>Dashboard</h1>
          <p>Here’s what’s happening at Tita Mars today.</p>
        </div>
        <button className="btn-secondary" onClick={exportOrders}>
          <Icon name="download" size={17} />
          Export report
        </button>
      </header>
      <div className="metric-grid">
        {[
          ["Total Sales", peso.format(total), "From completed orders", "cash"],
          ["Total Orders", orders.length, "Across all order statuses", "cart"],
          ["Customers", customers, "Unique customers", "users"],
          [
            "Available Products",
            products.filter((p) => !p.archived && p.available && p.stock > 0)
              .length,
            "Ready for your customers",
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
      <div className="dashboard-chart-grid">
        <section className="simple-card">
          <header className="table-toolbar">
            <h2>Sales Overview</h2>
            <span className="period-label">Last 7 days</span>
          </header>
          <SalesChart orders={orders} />
        </section>
        <section className="simple-card">
          <header className="table-toolbar">
            <h2>Top Products</h2>
            <a className="text-link" href="#reports">
              View report <Icon name="arrow" size={14} />
            </a>
          </header>
          {top.length ? (
            <div className="top-products">
              {top.map((p) => (
                <article key={p.id}>
                  <img
                    src={
                      products.find((item) => item.id === p.id)?.image ||
                      p.image
                    }
                    alt=""
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.supplier}</small>
                  </span>
                  <b>{p.sold}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <Icon name="chart" size={35} />
              <p>
                Your bestsellers will appear after the first completed order.
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="simple-card">
        <header className="table-toolbar">
          <h2>Recent Orders</h2>
          <a className="text-link" href="#manage-orders">
            View All <Icon name="arrow" size={15} />
          </a>
        </header>
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
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.number}</strong>
                  </td>
                  <td>{o.customer}</td>
                  <td>{prettyDate(o.createdAt)}</td>
                  <td>{peso.format(o.total)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td>
                    <a
                      className="table-view"
                      href={`#manage-orders?order=${o.id}`}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && (
          <div className="dashboard-empty">
            <Icon name="orders" size={35} />
            <p>Your first customer order will appear here.</p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
