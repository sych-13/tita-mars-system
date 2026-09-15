import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import { useCart } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import { useHashRoute } from "../hooks/useHashRoute";
const links = [
  ["Home", "home"],
  ["Menu", "catalog"],
  ["Orders", "my-orders"],
  ["About", "about"],
];
export default function Navbar() {
  const { itemCount } = useCart();
  const { user, role } = useSession();
  const { route, navigate } = useHashRoute();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="customer-navbar">
      <div className="container customer-nav-inner">
        <BrandMark onClick={() => setOpen(false)} />
        <nav
          className={`main-nav ${open ? "open" : ""}`}
          aria-label="Main navigation"
        >
          {links.map(([label, href]) => (
            <a
              key={href}
              href={`#${href}`}
              className={route === href ? "active" : ""}
              aria-current={route === href ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <form
          className="nav-search search-field"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("catalog", { q: search });
          }}
        >
          <input
            aria-label="Search products"
            placeholder="Search for products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button aria-label="Search menu" className="icon-button">
            <Icon name="search" size={18} />
          </button>
        </form>
        <div className="nav-actions">
          <a
            className="icon-button mobile-search"
            href="#catalog"
            aria-label="Search menu"
          >
            <Icon name="search" />
          </a>
          <a
            className="icon-button cart-link"
            href="#cart"
            aria-label={`Cart, ${itemCount} items`}
          >
            <Icon name="cart" size={24} />
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </a>
          <a
            href={user ? "#profile" : "#access"}
            className="profile-button"
            aria-label={user ? "My profile" : "Account and workspaces"}
          >
            <Icon name="user" size={22} />
            <span>
              {user?.name.split(" ")[0] ||
                (role === "customer"
                  ? "Account"
                  : role === "owner"
                    ? "Owner"
                    : "Staff")}
            </span>
          </a>
          <ThemeToggle />
          <button
            className="nav-menu-button icon-button"
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}
