import { useState } from "react";
import { useSession } from "../context/SessionContext";
import { useShop } from "../context/ShopContext";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
export default function ProfilePage() {
  const { user, updateProfile, role } = useSession();
  const { notify } = useShop();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await updateProfile(form);
    notify(r.ok ? "Your profile was updated." : r.error);
    setBusy(false);
  };
  if (!user)
    return (
      <section className="container page-section narrow-page">
        <div className="simple-card">
          <Icon name="user" size={42} />
          <h1>Make yourself at home.</h1>
          <p>Sign in to manage your details and keep your orders together.</p>
          <a href="#login" className="btn-brand">
            Sign in <Icon name="arrow" size={16} />
          </a>
          <a href="#access" className="text-link">
            Choose a workspace
          </a>
        </div>
      </section>
    );
  return (
    <section className="container page-section profile-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">My account</p>
          <h1>My Profile</h1>
          <p>A few details for an easier next order.</p>
        </div>
        <a className="btn-secondary" href="#my-orders">
          <Icon name="orders" />
          My orders
        </a>
      </header>
      <form className="simple-card profile-form" onSubmit={save}>
        <div className="profile-title">
          <Icon name="user" size={40} />
          <div>
            <h2>{user.name}</h2>
            <small>
              {role === "owner"
                ? "Owner / Admin"
                : role === "staff"
                  ? "Staff member"
                  : "Tita Mars customer"}
            </small>
          </div>
        </div>
        <div className="form-grid">
          {[
            ["name", "Full name"],
            ["email", "Email address"],
            ["phone", "Mobile number"],
            ["address", "Delivery address"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={name === "email" ? "email" : "text"}
                required={name === "name" || name === "email"}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="profile-theme">
          <span>Appearance</span>
          <ThemeToggle />
        </div>
        <div className="editor-actions">
          <button className="btn-brand" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <a href="#logout" className="text-danger-button">
            Logout
          </a>
        </div>
      </form>
    </section>
  );
}
