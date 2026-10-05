import Sidebar from "../components/Sidebar";
import Icon from "../components/Icon";
import NotificationCenter from "../components/NotificationCenter";
export default function DashboardLayout({ children, role = "Owner / Admin" }) {
  return (
    <div className="dashboard-shell">
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
      <Sidebar role={role} />
      <div className="workspace-body">
        <header className="workspace-topbar">
          <span>
            <Icon name="store" size={18} />
            Tita Mars <small>/ {role === "Staff" ? "Staff" : "Overview"}</small>
          </span>
          <div className="workspace-topbar-actions">
            <NotificationCenter />
            <span>
              <Icon name="calendar" size={17} />
              {new Date().toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <main id="main-content" className="dashboard-content" tabIndex="-1">
          {children}
        </main>
      </div>
    </div>
  );
}
