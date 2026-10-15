export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function emailActionUrl(route, origin, baseUrl) {
  const url = new URL(baseUrl || "/", origin);
  url.hash = route.startsWith("#") ? route : `#${route}`;
  return url.toString();
}
