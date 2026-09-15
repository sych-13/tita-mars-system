import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import { useSession } from "../context/SessionContext";
import { useHashRoute } from "../hooks/useHashRoute";
export default function Sidebar({ role = "Owner / Admin" }) {
  const { user } = useSession();
  const { route } = useHashRoute();
  const staff = role === "Staff";
  const links = staff
    ? [
        ["staff", "home", "Dashboard"],
        ["manage-orders", "orders", "Orders"],
        ["inventory", "inventory", "Inventory"],
        ["staff-reports", "chart", "Reports"],
      ]
    : [
        ["owner", "home", "Dashboard"],
        ["manage-orders", "orders", "Orders"],
        ["products", "store", "Products"],
        ["inventory", "inventory", "Inventory"],
        ["reports", "chart", "Reports"],
        ["staff-management", "users", "Staff"],
        ["settings", "settings", "Settings"],
      ];
  return (
    <aside className="app-sidebar">
      <BrandMark />
      <p className="sidebar-label">
        {staff ? "Staff workspace" : "Owner workspace"}
      </p>
      <nav aria-label="Workspace navigation">
        {links.map(([path, icon, label]) => (
          <a
            href={`#${path}`}
            key={path}
            className={route === path ? "active" : ""}
            aria-current={route === path ? "page" : undefined}
          >
            <Icon
              name={icon}
              size={21}
              weight={route === path ? "fill" : "regular"}
            />
            <span>{label}</span>
            {route === path && <Icon name="next" size={14} />}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-person">
          <Icon name="user" size={25} />
          <span>
            <strong>
              {user?.name || (staff ? "Staff member" : "Tita Mars")}
            </strong>
            <small>{role}</small>
          </span>
        </div>
        <div className="sidebar-controls">
          <ThemeToggle />
          <a href="#logout" className="sign-out">
            <Icon name="logout" size={19} />
            Logout
          </a>
        </div>
        <a href="#home" className="sidebar-store-link">
          View storefront <Icon name="arrow" size={15} />
        </a>
      </div>
    </aside>
  );
}
