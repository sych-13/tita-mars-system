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
    <section className="container access-page">
      <header className="access-heading">
        <p className="eyebrow">Welcome to Tita Mars</p>
        <h1>A place for everyone.</h1>
        <p>
          {usingFirebase
            ? "Sign in to the account assigned to you."
            : "Sign in to your account, or explore a workspace preview."}
        </p>
      </header>
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
            {!usingFirebase && (
              <button
                className="text-link preview-link"
                onClick={() => {
                  setRole(role);
                  window.location.hash = destination;
                }}
              >
                Explore preview
              </button>
            )}
          </article>
        ))}
      </div>
      {usingFirebase && (
        <p className="access-role-note" role="note">
          Staff and Owner/Admin access is restricted to assigned accounts. Use
          your private workspace sign-in link.
        </p>
      )}
    </section>
  );
}
