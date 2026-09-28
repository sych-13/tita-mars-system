import test from "node:test";
import assert from "node:assert/strict";
import {
  statusChangesForOrder,
  summarizeOrderItems,
} from "../src/utils/orderFlow.js";

test("pickup orders follow the required status sequence", () => {
  assert.deepEqual(
    statusChangesForOrder({ status: "Preparing", orderType: "pickup" }),
    ["Preparing", "Ready for Pickup", "Cancelled"],
  );
  assert.deepEqual(
    statusChangesForOrder({ status: "Ready for Pickup", orderType: "pickup" }),
    ["Ready for Pickup", "Completed", "Cancelled"],
  );
});

test("delivery orders use out for delivery and lock terminal states", () => {
  assert.deepEqual(
    statusChangesForOrder({ status: "Preparing", orderType: "delivery" }),
    ["Preparing", "Out for Delivery", "Cancelled"],
  );
  assert.deepEqual(
    statusChangesForOrder({ status: "Completed", orderType: "delivery" }),
    ["Completed"],
  );
  assert.deepEqual(
    statusChangesForOrder({ status: "Cancelled", orderType: "delivery" }),
    ["Cancelled"],
  );
});

test("item quantities are positive integers and duplicate products aggregate", () => {
  const result = summarizeOrderItems([
    { id: "eatery-adobo", quantity: 2 },
    { id: "eatery-adobo", quantity: 1 },
    { id: "eatery-rice", quantity: 2 },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.quantities.get("eatery-adobo"), 3);
  assert.equal(result.quantities.get("eatery-rice"), 2);
  assert.equal(summarizeOrderItems([{ id: "eatery-rice", quantity: -1 }]).ok, false);
  assert.equal(summarizeOrderItems([{ id: "eatery-rice", quantity: 1.5 }]).ok, false);
});
