export const SESSION_WARNING_MS = 60 * 1000;

export const SESSION_TIMEOUT_MS = Object.freeze({
  owner: 30 * 60 * 1000,
  staff: 30 * 60 * 1000,
  customer: 60 * 60 * 1000,
});

export const idleTimeoutForRole = (role) =>
  SESSION_TIMEOUT_MS[role] || SESSION_TIMEOUT_MS.customer;

export function sessionIdleState(role, lastActivity, now = Date.now()) {
  const elapsed = Math.max(0, now - lastActivity);
  const remainingMs = Math.max(0, idleTimeoutForRole(role) - elapsed);
  return {
    remainingMs,
    timedOut: remainingMs === 0,
    warningSeconds:
      remainingMs > 0 && remainingMs <= SESSION_WARNING_MS
        ? Math.ceil(remainingMs / 1000)
        : null,
  };
}
