import { useMemo, useState } from "react";
import { useActivity } from "../context/ActivityContext";
import { prettyDate } from "../utils/formatters";
import DashboardLayout from "../layouts/DashboardLayout";
import Icon from "./Icon";

export default function ActivityLogPage() {
  const { logs } = useActivity();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const types = useMemo(
    () => [...new Set(logs.map((entry) => entry.entityType))].sort(),
    [logs],
  );
  const visible = logs.filter(
    (entry) =>
      (type === "all" || entry.entityType === type) &&
      `${entry.summary} ${entry.actorName} ${entry.action} ${entry.entityId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <DashboardLayout role="Owner / Admin">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Accountability at a glance</p>
          <h1>Activity Log</h1>
          <p>Review important product, inventory, order, staff, and settings changes.</p>
        </div>
        <span className="period-label">{logs.length} recorded actions</span>
      </header>
      <section className="simple-card">
        <header className="table-toolbar">
          <h2>System activity</h2>
          <div className="product-table-filters">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                aria-label="Search activity"
                placeholder="Search activity or staff..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter activity type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All activity</option>
              {types.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </header>
        {visible.length ? (
          <div className="activity-list">
            {visible.map((entry) => (
              <article key={entry.id}>
                <span className="activity-icon">
                  <Icon name="activity" size={19} />
                </span>
                <div>
                  <strong>{entry.summary}</strong>
                  <small>
                    {entry.actorName} · {entry.actorRole} · {prettyDate(entry.createdAt)}
                  </small>
                </div>
                <span className="period-label">{entry.entityType}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <Icon name="activity" size={38} />
            <p>No recorded activity matches this filter.</p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
