import { useSession } from "../context/SessionContext";
import Icon from "./Icon";
const roles = [
  [
    "customer",
    "Customer",
    "Your next favorite meal is a few taps away.",
    "cart",
    "home",
  ],
  [
    "staff",
    "Staff",
    "Prepare orders and keep the kitchen moving.",
    "orders",
    "staff",
  ],
  [
    "owner",
    "Owner / Admin",
    "Manage your store, products, and team.",
    "chart",
    "owner",
  ],
];
export default function AccessPage() {
  const { setRole, usingFirebase } = useSession();
  const visibleRoles = usingFirebase ? roles.filter(([role]) => role === "customer") : roles;
  return (
    <section className={`container access-page ${usingFirebase ? "customer-access-page" : ""}`}>
      <header className="access-heading">
        <p className="eyebrow">Account access</p>
        <h1>Welcome back to Tita Mars.</h1>
        <p>
          {usingFirebase
            ? "Sign in to keep your favorites, cart, and orders together."
            : "Sign in to your account, or explore a workspace preview."}
        </p>
      </header>
      {usingFirebase ? (
        <div className="customer-access-layout">
          <article className="access-card customer-access-card">
            <span className="access-icon">
              <Icon name="user" size={30} />
            </span>
            <p className="category-kicker">Customer account</p>
            <h2>Order your favorites with ease.</h2>
            <p>
              Sign in to manage your profile, save your favorites, follow your
              orders, and check out faster next time.
            </p>
            <div className="customer-access-actions">
              <a className="btn-brand" href="#login?role=customer">
                Sign in <Icon name="arrow" size={16} />
              </a>
              <a className="btn-secondary" href="#register">
                Create an account
              </a>
            </div>
            <div className="customer-access-benefits">
              <span><Icon name="check" size={15} /> Track your orders</span>
              <span><Icon name="check" size={15} /> Save delivery details</span>
              <span><Icon name="check" size={15} /> Use Google or Facebook</span>
            </div>
          </article>
          <aside className="private-access-card">
            <span className="private-access-icon"><Icon name="lock" size={20} /></span>
            <h2>Private workspace access</h2>
            <p>
              Staff and Owner/Admin sign-in is restricted to assigned accounts
              and is not shown in the customer account menu.
            </p>
            <small>Team members can open their private sign-in below. Seeing the page does not grant workspace access; Firebase still checks the account role.</small>
            <div className="private-workspace-links" aria-label="Private workspace sign-in links">
              <a className="btn-secondary" href="#login?role=staff">
                Staff sign in <Icon name="arrow" size={15} />
              </a>
              <a className="btn-secondary" href="#login?role=owner">
                Owner sign in <Icon name="arrow" size={15} />
              </a>
            </div>
          </aside>
        </div>
      ) : (
        <div className="access-grid">
          {visibleRoles.map(([role, label, copy, icon, destination]) => (
            <article className="access-card" key={role}>
              <span className="access-icon">
                <Icon name={icon} size={30} />
              </span>
              <h2>{label}</h2>
              <p>{copy}</p>
              <a className="btn-brand" href={`#login?role=${role}`}>
                Login <Icon name="arrow" size={16} />
              </a>
              <button
                className="text-link preview-link"
                onClick={() => {
                  setRole(role);
                  window.location.hash = destination;
                }}
              >
                Explore preview
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
