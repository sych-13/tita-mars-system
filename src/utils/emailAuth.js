export const PENDING_EMAIL_LOGIN_KEY = "tita-mars-pending-email-login";

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function emailActionUrl(route, origin, baseUrl) {
  const url = new URL(baseUrl || "/", origin);
  url.hash = route.startsWith("#") ? route : `#${route}`;
  return url.toString();
}

export function destinationForRole() {
  return "home";
}

export function safeDestination(value, role) {
  const fallback = destinationForRole(role);
  const route = String(value || "").replace(/^#/, "");
  return /^[a-z0-9-]+(?:\?[a-z0-9%&=._~-]+)?$/i.test(route)
    ? route
    : fallback;
}

export function readPendingEmailLogin(storage = globalThis.localStorage) {
  try {
    const pending = JSON.parse(storage?.getItem(PENDING_EMAIL_LOGIN_KEY));
    if (!pending || !normalizeEmail(pending.email)) return null;
    return pending;
  } catch {
    return null;
  }
}

export function savePendingEmailLogin(
  pending,
  storage = globalThis.localStorage,
) {
  storage?.setItem(
    PENDING_EMAIL_LOGIN_KEY,
    JSON.stringify({
      ...pending,
      email: normalizeEmail(pending.email),
      requestedAt: new Date().toISOString(),
    }),
  );
}

export function clearPendingEmailLogin(storage = globalThis.localStorage) {
  storage?.removeItem(PENDING_EMAIL_LOGIN_KEY);
}
