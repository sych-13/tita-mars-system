import { useCallback, useEffect, useState } from "react";

const aliases = {
  "": "home",
  top: "home",
  menu: "catalog",
  "customer-dashboard": "my-orders",
  "order-history": "my-orders",
  "staff-dashboard": "staff",
  "owner-dashboard": "owner",
  orders: "manage-orders",
};

const readLocation = () => {
  const raw = window.location.hash.replace(/^#/, "") || "home";
  const [path, query = ""] = raw.split("?");
  return {
    route: aliases[path] || path,
    params: Object.fromEntries(new URLSearchParams(query)),
  };
};

export function useHashRoute() {
  const [location, setLocation] = useState(readLocation);
  useEffect(() => {
    const onHashChange = () => setLocation(readLocation());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const navigate = useCallback((route, params = {}) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `${route}${query ? `?${query}` : ""}`;
  }, []);
  return { ...location, navigate };
}
