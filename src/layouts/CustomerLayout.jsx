import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";
import { useHashRoute } from "../hooks/useHashRoute";
import { useCart } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
export default function CustomerLayout({ children }) {
  const { route } = useHashRoute();
  const { itemCount } = useCart();
  const { role } = useSession();
  const workspace =
    role === "owner"
      ? ["owner", "chart", "Workspace"]
      : role === "staff"
        ? ["staff", "orders", "Workspace"]
        : ["profile", "user", "Account"];
  const nav = [
    ["home", "home", "Home"],
    ["catalog", "meal", "Menu"],
    ["cart", "cart", "Cart"],
    workspace,
  ];
  return (
    <div className="customer-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" tabIndex="-1">
        {children}
      </main>
      <Footer />
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {nav.map(([path, icon, label]) => (
          <a
            key={path}
            href={`#${path}`}
            className={route === path ? "active" : ""}
            aria-current={route === path ? "page" : undefined}
          >
            <span>
              <Icon
                name={icon}
                weight={route === path ? "fill" : "regular"}
                size={22}
              />
              {path === "cart" && itemCount > 0 && <b>{itemCount}</b>}
            </span>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
