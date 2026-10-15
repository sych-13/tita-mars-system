import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPendingEmailLogin,
  destinationForRole,
  emailActionUrl,
  normalizeEmail,
  readPendingEmailLogin,
  safeDestination,
  savePendingEmailLogin,
} from "../src/utils/emailAuth.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("normalizes email and builds hosting-aware verification links", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(
    emailActionUrl(
      "verify-email",
      "https://sych-13.github.io",
      "/tita-mars-system/",
    ),
    "https://sych-13.github.io/tita-mars-system/#verify-email",
  );
});

test("pending email-login state can be saved, read, and cleared", () => {
  const storage = memoryStorage();
  savePendingEmailLogin(
    { email: " Customer@Example.com ", role: "customer", next: "checkout" },
    storage,
  );
  const pending = readPendingEmailLogin(storage);
  assert.equal(pending.email, "customer@example.com");
  assert.equal(pending.role, "customer");
  assert.equal(pending.next, "checkout");
  assert.ok(pending.requestedAt);
  clearPendingEmailLogin(storage);
  assert.equal(readPendingEmailLogin(storage), null);
});

test("email callbacks only continue to safe in-app destinations", () => {
  assert.equal(destinationForRole("customer"), "home");
  assert.equal(destinationForRole("staff"), "home");
  assert.equal(destinationForRole("owner"), "home");
  assert.equal(safeDestination("my-orders", "customer"), "my-orders");
  assert.equal(safeDestination("product?id=TM-EAT-001", "customer"), "product?id=TM-EAT-001");
  assert.equal(safeDestination("https://malicious.example", "owner"), "home");
  assert.equal(safeDestination("//malicious.example", "staff"), "home");
});
