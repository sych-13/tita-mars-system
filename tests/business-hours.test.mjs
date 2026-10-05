import test from "node:test";
import assert from "node:assert/strict";

import {
  isStoreOpen,
  storeHoursLabel,
  validateOrderSchedule,
} from "../src/utils/businessHours.js";

const settings = {
  orderingEnabled: true,
  openingTime: "06:00",
  closingTime: "21:00",
  allowScheduledOrders: true,
  maxScheduleDays: 7,
};

test("detects store hours in Asia/Manila", () => {
  assert.equal(isStoreOpen(settings, new Date("2026-10-05T02:00:00.000Z")), true);
  assert.equal(isStoreOpen(settings, new Date("2026-10-05T14:00:00.000Z")), false);
});

test("supports overnight store hours", () => {
  const overnight = { ...settings, openingTime: "18:00", closingTime: "02:00" };
  assert.equal(isStoreOpen(overnight, new Date("2026-10-05T15:00:00.000Z")), true);
  assert.equal(isStoreOpen(overnight, new Date("2026-10-05T05:00:00.000Z")), false);
});

test("blocks ASAP orders while closed and allows a valid scheduled order", () => {
  const now = new Date("2026-10-05T14:00:00.000Z");
  assert.equal(validateOrderSchedule(settings, "asap", null, now).ok, false);
  const result = validateOrderSchedule(
    settings,
    "scheduled",
    "2026-10-06T02:00:00.000Z",
    now,
  );
  assert.equal(result.ok, true);
  assert.equal(result.scheduledFor, "2026-10-06T02:00:00.000Z");
});

test("enforces minimum lead time, business hours, and booking window", () => {
  const now = new Date("2026-10-05T02:00:00.000Z");
  assert.equal(
    validateOrderSchedule(settings, "scheduled", "2026-10-05T02:05:00.000Z", now).ok,
    false,
  );
  assert.equal(
    validateOrderSchedule(settings, "scheduled", "2026-10-05T14:00:00.000Z", now).ok,
    false,
  );
  assert.equal(
    validateOrderSchedule(settings, "scheduled", "2026-10-20T02:00:00.000Z", now).ok,
    false,
  );
});

test("paused ordering and store-hour labels are explicit", () => {
  const paused = { ...settings, orderingEnabled: false };
  assert.equal(validateOrderSchedule(paused, "asap", null).ok, false);
  assert.equal(storeHoursLabel(paused), "Online ordering paused");
  assert.match(storeHoursLabel(settings), /6:00 AM/);
});
