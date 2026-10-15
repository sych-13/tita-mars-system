import assert from "node:assert/strict";
import test from "node:test";

import {
  emailActionUrl,
  normalizeEmail,
} from "../src/utils/emailAuth.js";

test("normalizes email and builds hosting-aware verification links", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(
    emailActionUrl(
      "login?role=customer&verified=1",
      "https://sych-13.github.io",
      "/tita-mars-system/",
    ),
    "https://sych-13.github.io/tita-mars-system/#login?role=customer&verified=1",
  );
});
