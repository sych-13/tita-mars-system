import assert from "node:assert/strict";
import test from "node:test";

import { prettyDate, toIsoDate } from "../src/utils/formatters.js";

const timestamp = "2026-09-27T00:00:00.000Z";

test("normalizes Firebase Timestamp values", () => {
  const firestoreTimestamp = {
    toDate: () => new Date(timestamp),
  };

  assert.equal(toIsoDate(firestoreTimestamp), timestamp);
  assert.equal(prettyDate(firestoreTimestamp), prettyDate(timestamp));
});

test("supports serialized Firebase Timestamp values", () => {
  assert.equal(
    toIsoDate({ seconds: 1_790_467_200, nanoseconds: 0 }),
    timestamp,
  );
});

test("invalid dates use a safe fallback instead of crashing the page", () => {
  assert.equal(toIsoDate(null), null);
  assert.equal(prettyDate(null), "Not available");
  assert.equal(prettyDate("not-a-date"), "Not available");
});
