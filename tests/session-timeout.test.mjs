import test from "node:test";
import assert from "node:assert/strict";
import {
  idleTimeoutForRole,
  sessionIdleState,
} from "../src/utils/sessionTimeout.js";

test("owner and staff sessions expire after 30 minutes", () => {
  assert.equal(idleTimeoutForRole("owner"), 30 * 60 * 1000);
  assert.equal(idleTimeoutForRole("staff"), 30 * 60 * 1000);
  assert.equal(sessionIdleState("staff", 0, 30 * 60 * 1000).timedOut, true);
});

test("customer sessions expire after 60 minutes", () => {
  assert.equal(idleTimeoutForRole("customer"), 60 * 60 * 1000);
  assert.equal(
    sessionIdleState("customer", 0, 59 * 60 * 1000).timedOut,
    false,
  );
  assert.equal(
    sessionIdleState("customer", 0, 60 * 60 * 1000).timedOut,
    true,
  );
});

test("the idle warning starts during the final minute", () => {
  const timeout = idleTimeoutForRole("owner");
  assert.equal(sessionIdleState("owner", 0, timeout - 61_000).warningSeconds, null);
  assert.equal(sessionIdleState("owner", 0, timeout - 60_000).warningSeconds, 60);
  assert.equal(sessionIdleState("owner", 0, timeout - 1_000).warningSeconds, 1);
});
