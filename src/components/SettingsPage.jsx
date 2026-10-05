import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import DashboardLayout from "../layouts/DashboardLayout";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import { storeHoursLabel } from "../utils/businessHours";
export default function SettingsPage() {
  const { settings, saveSettings, notify } = useShop();
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const save = async (e) => {
    e.preventDefault();
    const result = await saveSettings({
      ...draft,
      deliveryFee: Number(draft.deliveryFee),
    });
    notify(result.ok ? "Store settings saved." : result.error);
  };
  return (
    <DashboardLayout role="Owner / Admin">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Make it yours</p>
          <h1>Settings</h1>
          <p>Store details, fulfillment, and payment preferences.</p>
        </div>
      </header>
      <form className="settings-grid" onSubmit={save}>
        <section className="simple-card">
          <h2>
            <Icon name="store" />
            Store information
          </h2>
          <div className="form-grid">
            {[
              ["name", "Business name"],
              ["hours", "Business hours"],
              ["phone", "Contact number"],
              ["email", "Contact email"],
              ["address", "Pickup address"],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type={name === "email" ? "email" : "text"}
                  required={["name", "address", "hours"].includes(name)}
                  value={draft[name]}
                  onChange={(e) =>
                    setDraft({ ...draft, [name]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className="simple-card settings-ordering-card">
          <h2>
            <Icon name="clock" />
            Ordering schedule
          </h2>
          <p>
            Control when customers may place ASAP orders and how far ahead they
            can schedule. Current window: {storeHoursLabel(draft)}.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.orderingEnabled !== false}
              onChange={(event) =>
                setDraft({ ...draft, orderingEnabled: event.target.checked })
              }
            />
            <span>
              <strong>Accept online orders</strong>
              <small>Turn this off to pause both pickup and delivery checkout.</small>
            </span>
          </label>
          <div className="form-grid two-column">
            <label>
              Opening time
              <input
                type="time"
                required
                value={draft.openingTime || "06:00"}
                onChange={(event) =>
                  setDraft({ ...draft, openingTime: event.target.value })
                }
              />
            </label>
            <label>
              Closing time
              <input
                type="time"
                required
                value={draft.closingTime || "21:00"}
                onChange={(event) =>
                  setDraft({ ...draft, closingTime: event.target.value })
                }
              />
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.allowScheduledOrders !== false}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  allowScheduledOrders: event.target.checked,
                })
              }
            />
            <span>
              <strong>Allow scheduled orders</strong>
              <small>Customers can select a future pickup or delivery time.</small>
            </span>
          </label>
          <label>
            Maximum advance booking (days)
            <input
              type="number"
              min="1"
              max="30"
              step="1"
              required
              value={draft.maxScheduleDays ?? 7}
              onChange={(event) =>
                setDraft({ ...draft, maxScheduleDays: event.target.value })
              }
            />
          </label>
        </section>
        <section className="simple-card">
          <h2>
            <Icon name="delivery" />
            Delivery & payment
          </h2>
          <p>Pickup is always available. Delivery serves Taytay and Cainta.</p>
          <label>
            Delivery fee (₱)
            <input
              type="number"
              min="0"
              step="1"
              required
              value={draft.deliveryFee}
              onChange={(e) =>
                setDraft({ ...draft, deliveryFee: e.target.value })
              }
            />
          </label>
          <label>
            GCash account name
            <input
              value={draft.gcashName}
              onChange={(e) =>
                setDraft({ ...draft, gcashName: e.target.value })
              }
            />
          </label>
          <label>
            GCash number
            <input
              type="tel"
              value={draft.gcashNumber}
              onChange={(e) =>
                setDraft({ ...draft, gcashNumber: e.target.value })
              }
            />
          </label>
        </section>
        <section className="simple-card">
          <h2>Appearance</h2>
          <p>Choose the look that feels right for you.</p>
          <ThemeToggle />
        </section>
        <div className="settings-save">
          <button className="btn-brand" type="submit">
            <Icon name="check" size={18} />
            Save settings
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
