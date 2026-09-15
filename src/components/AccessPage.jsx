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
  const { setRole } = useSession();
  return (
    <section className="container access-page">
      <header className="access-heading">
        <p className="eyebrow">Welcome to Tita Mars</p>
        <h1>A place for everyone.</h1>
        <p>Sign in to your account, or explore a workspace preview.</p>
      </header>
      <div className="access-grid">
        {roles.map(([role, label, copy, icon, destination]) => (
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
    </section>
  );
}
