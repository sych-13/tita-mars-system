import { useState } from "react";
import { useShop } from "../context/ShopContext";
import DashboardLayout from "../layouts/DashboardLayout";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
export default function SettingsPage() {
  const { settings, saveSettings, notify } = useShop();
  const [draft, setDraft] = useState(settings);
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
