import { useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ProductProvider } from "./context/ProductContext";
import { OrdersProvider } from "./context/OrdersContext";
import { CartProvider } from "./context/CartContext";
import { SessionProvider, useSession } from "./context/SessionContext";
import { useHashRoute } from "./hooks/useHashRoute";
import CustomerLayout from "./layouts/CustomerLayout";
import HomePage from "./components/HomePage";
import ProductCatalog from "./components/ProductCatalog";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import CustomerDashboard from "./components/CustomerDashboard";
import StaffDashboard from "./components/StaffDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import ProductManagement from "./components/ProductManagement";
import InventoryManagement from "./components/InventoryManagement";
import OrderManagement from "./components/OrderManagement";
import ReportsPage from "./components/ReportsPage";
import AboutPage from "./components/AboutPage";
import AccessPage from "./components/AccessPage";
import { ShopProvider } from "./context/ShopContext";
import AuthPage, { ForgotPassword } from "./components/AuthPage";
import ProfilePage from "./components/ProfilePage";
import ProductDetail from "./components/ProductDetail";
import StaffManagement from "./components/StaffManagement";
import SettingsPage from "./components/SettingsPage";
import LogoutPage from "./components/LogoutPage";

function CustomerPage({ children }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}

function AccessRequired({ allowed, children }) {
  const { role } = useSession();
  if (allowed.includes(role)) return children;
  return (
    <CustomerPage>
      <section className="access-page page-section">
        <div className="container access-required">
          <span className="access-icon">
            <i className="fa-solid fa-lock" />
          </span>
          <p className="eyebrow">Workspace access</p>
          <h1>This area needs a different role.</h1>
          <p>Choose the Staff or Owner / Admin demo workspace to continue.</p>
          <a className="btn-brand" href="#access">
            Choose workspace <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      </section>
    </CustomerPage>
  );
}

function NotFoundPage() {
  return (
    <CustomerPage>
      <section className="access-page page-section">
        <div className="container access-required">
          <span className="access-icon">
            <i className="fa-solid fa-map-location-dot" />
          </span>
          <p className="eyebrow">Page not found</p>
          <h1>Let’s get you back to Tita Mars.</h1>
          <p>
            The page you were looking for is not available in this prototype.
          </p>
          <a className="btn-brand" href="#home">
            Back to home <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      </section>
    </CustomerPage>
  );
}

function AppViews() {
  const { route, params } = useHashRoute();
  const { role } = useSession();
  const staffRole = role === "staff" ? "staff" : "owner";
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // The confirmation panel deliberately takes focus in Checkout.
    if (route === "checkout" && params.order) return undefined;
    const focusTimer = window.setTimeout(
      () =>
        document.getElementById("main-content")?.focus({ preventScroll: true }),
      0,
    );
    return () => window.clearTimeout(focusTimer);
  }, [params.order, route]);
  switch (route) {
    case "home":
      return (
        <CustomerPage>
          <HomePage />
        </CustomerPage>
      );
    case "catalog":
      return (
        <CustomerPage>
          <ProductCatalog />
        </CustomerPage>
      );
    case "cart":
      return (
        <CustomerPage>
          <Cart />
        </CustomerPage>
      );
    case "checkout":
      return (
        <CustomerPage>
          <Checkout />
        </CustomerPage>
      );
    case "my-orders":
      return (
        <CustomerPage>
          <CustomerDashboard />
        </CustomerPage>
      );
    case "about":
      return (
        <CustomerPage>
          <AboutPage />
        </CustomerPage>
      );
    case "access":
      return (
        <CustomerPage>
          <AccessPage />
        </CustomerPage>
      );
    case "login":
      return (
        <CustomerPage>
          <AuthPage key={params.role || "customer"} />
        </CustomerPage>
      );
    case "register":
      return (
        <CustomerPage>
          <AuthPage mode="register" key="register" />
        </CustomerPage>
      );
    case "setup":
      return (
        <CustomerPage>
          <AuthPage mode="setup" key="setup" />
        </CustomerPage>
      );
    case "forgot-password":
      return (
        <CustomerPage>
          <ForgotPassword />
        </CustomerPage>
      );
    case "profile":
      return (
        <CustomerPage>
          <ProfilePage />
        </CustomerPage>
      );
    case "product":
      return (
        <CustomerPage>
          <ProductDetail key={params.id} />
        </CustomerPage>
      );
    case "logout":
      return (
        <CustomerPage>
          <LogoutPage />
        </CustomerPage>
      );
    case "staff":
      return (
        <AccessRequired allowed={["staff", "owner"]}>
          <StaffDashboard />
        </AccessRequired>
      );
    case "owner":
      return (
        <AccessRequired allowed={["owner"]}>
          <OwnerDashboard />
        </AccessRequired>
      );
    case "products":
      return (
        <AccessRequired allowed={["owner"]}>
          <ProductManagement />
        </AccessRequired>
      );
    case "inventory":
      return (
        <AccessRequired allowed={["staff", "owner"]}>
          <InventoryManagement role={staffRole} />
        </AccessRequired>
      );
    case "manage-orders":
      return (
        <AccessRequired allowed={["staff", "owner"]}>
          <OrderManagement role={staffRole} />
        </AccessRequired>
      );
    case "reports":
      return (
        <AccessRequired allowed={["owner"]}>
          <ReportsPage />
        </AccessRequired>
      );
    case "staff-reports":
      return (
        <AccessRequired allowed={["staff", "owner"]}>
          <ReportsPage role="staff" />
        </AccessRequired>
      );
    case "staff-management":
      return (
        <AccessRequired allowed={["owner"]}>
          <StaffManagement />
        </AccessRequired>
      );
    case "settings":
      return (
        <AccessRequired allowed={["owner"]}>
          <SettingsPage />
        </AccessRequired>
      );
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ShopProvider>
          <ProductProvider>
            <OrdersProvider>
              <CartProvider>
                <AppViews />
              </CartProvider>
            </OrdersProvider>
          </ProductProvider>
        </ShopProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
