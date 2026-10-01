import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "tita-mars-system-202609";
const rulesPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../firestore.rules",
);

let testEnv;

const iso = (minute = 0) => `2026-10-01T00:${String(minute).padStart(2, "0")}:00.000Z`;

const profile = (name, email, role) => ({
  name,
  email,
  phone: "09123456789",
  address: "Taytay, Rizal",
  role,
  active: true,
  createdAt: iso(),
  updatedAt: iso(),
});

const product = (id = "TME-001", overrides = {}) => ({
  id,
  name: id === "TME-001" ? "Adobo" : "Chicken",
  category: "Tita Mars Eatery",
  supplier: "Tita Mars Eatery",
  price: 70,
  stock: 20,
  available: true,
  archived: false,
  image: "/assets/temporary-product.jpg",
  description: "Freshly prepared meal.",
  createdAt: iso(),
  updatedAt: iso(),
  ...overrides,
});

const order = (id, customerId, overrides = {}) => ({
  id,
  customerId,
  customer: "Test Customer",
  phone: "09123456789",
  email: "customer@example.com",
  address: "",
  deliveryArea: "",
  notes: "",
  orderType: "pickup",
  payment: "cash",
  subtotal: 70,
  deliveryFee: 0,
  total: 70,
  items: [
    {
      id: "TME-001",
      name: "Adobo",
      price: 70,
      quantity: 1,
    },
  ],
  number: `TM-${id.toUpperCase()}`,
  status: "Pending",
  createdAt: iso(),
  updatedAt: iso(),
  inventoryDeductedAt: null,
  ...overrides,
});

const storeSettings = {
  name: "Tita Mars Eatery and Bakery",
  phone: "09123456789",
  email: "store@example.com",
  address: "Taytay, Rizal",
  hours: "Open 24/7",
  deliveryFee: 20,
  gcashName: "Tita Mars",
  gcashNumber: "09123456789",
};

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "products/TME-001"), product()),
      setDoc(doc(db, "profiles/owner-1"), profile("Owner", "owner@example.com", "owner")),
      setDoc(doc(db, "profiles/staff-1"), profile("Staff", "staff@example.com", "staff")),
      setDoc(doc(db, "profiles/customer-a"), profile("Customer A", "a@example.com", "customer")),
      setDoc(doc(db, "profiles/customer-b"), profile("Customer B", "b@example.com", "customer")),
      setDoc(doc(db, "orders/order-a"), order("order-a", "customer-a")),
      setDoc(doc(db, "orders/order-b"), order("order-b", "customer-b")),
      setDoc(doc(db, "settings/store"), storeSettings),
    ]);
  });
}

before(async () => {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulatorHost) {
    throw new Error("Run this suite through `npm run test:rules`.");
  }
  const separator = emulatorHost.lastIndexOf(":");
  const host = emulatorHost.slice(0, separator);
  const port = Number(emulatorHost.slice(separator + 1));
  const rules = await readFile(rulesPath, "utf8");
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host, port, rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

after(async () => {
  await testEnv?.cleanup();
});

test("public visitors can read the catalog and store settings only", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "products/TME-001")));
  await assertSucceeds(getDoc(doc(db, "settings/store")));
  await assertFails(getDoc(doc(db, "orders/order-a")));
  await assertFails(setDoc(doc(db, "products/attacker-product"), product("attacker-product")));
});

test("customers can create only their own valid pending orders", async () => {
  const db = testEnv.authenticatedContext("customer-a").firestore();
  await assertSucceeds(
    setDoc(doc(db, "orders/customer-order"), order("customer-order", "customer-a")),
  );
  await assertFails(
    setDoc(doc(db, "orders/forged-owner"), order("forged-owner", "customer-b")),
  );
  await assertFails(
    setDoc(
      doc(db, "orders/already-completed"),
      order("already-completed", "customer-a", { status: "Completed" }),
    ),
  );
});

test("customers cannot read another customer's orders", async () => {
  const db = testEnv.authenticatedContext("customer-a").firestore();
  await assertSucceeds(getDoc(doc(db, "orders/order-a")));
  await assertFails(getDoc(doc(db, "orders/order-b")));
});

test("new users cannot assign themselves staff or owner access", async () => {
  const customerDb = testEnv.authenticatedContext("new-customer").firestore();
  await assertSucceeds(
    setDoc(
      doc(customerDb, "profiles/new-customer"),
      profile("New Customer", "new@example.com", "customer"),
    ),
  );
  const attackerDb = testEnv.authenticatedContext("attacker").firestore();
  await assertFails(
    setDoc(
      doc(attackerDb, "profiles/attacker"),
      profile("Attacker", "attacker@example.com", "owner"),
    ),
  );
});

test("staff can follow order status transitions but cannot skip or edit totals", async () => {
  const db = testEnv.authenticatedContext("staff-1").firestore();
  const orderRef = doc(db, "orders/order-a");
  await assertFails(
    updateDoc(orderRef, { status: "Completed", updatedAt: iso(1), inventoryDeductedAt: iso(1) }),
  );
  await assertFails(updateDoc(orderRef, { total: 1 }));
  await assertSucceeds(updateDoc(orderRef, { status: "Confirmed", updatedAt: iso(1) }));
  await assertSucceeds(updateDoc(orderRef, { status: "Preparing", updatedAt: iso(2) }));
  await assertSucceeds(updateDoc(orderRef, { status: "Ready for Pickup", updatedAt: iso(3) }));
  await assertSucceeds(
    updateDoc(orderRef, {
      status: "Completed",
      updatedAt: iso(4),
      inventoryDeductedAt: iso(4),
    }),
  );
  await assertFails(updateDoc(orderRef, { status: "Confirmed", updatedAt: iso(5) }));
});

test("staff may deduct stock but cannot restock or edit product details", async () => {
  const db = testEnv.authenticatedContext("staff-1").firestore();
  const productRef = doc(db, "products/TME-001");
  await assertSucceeds(updateDoc(productRef, { stock: 19, updatedAt: iso(1) }));
  await assertFails(updateDoc(productRef, { stock: 21, updatedAt: iso(2) }));
  await assertFails(updateDoc(productRef, { price: 1, updatedAt: iso(2) }));
});

test("only owners can manage products, store settings, and staff profiles", async () => {
  const ownerDb = testEnv.authenticatedContext("owner-1").firestore();
  const staffDb = testEnv.authenticatedContext("staff-1").firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "products/TME-002"), product("TME-002")));
  await assertSucceeds(
    updateDoc(doc(ownerDb, "settings/store"), { deliveryFee: 25 }),
  );
  await assertSucceeds(
    setDoc(
      doc(ownerDb, "profiles/staff-2"),
      profile("Staff Two", "staff2@example.com", "staff"),
    ),
  );
  await assertFails(
    updateDoc(doc(staffDb, "settings/store"), { deliveryFee: 1 }),
  );
  await assertFails(
    setDoc(
      doc(staffDb, "profiles/staff-3"),
      profile("Staff Three", "staff3@example.com", "staff"),
    ),
  );
});

test("a customer can review a completed own order only once", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "orders/completed-order"),
      order("completed-order", "customer-a", {
        status: "Completed",
        inventoryDeductedAt: iso(4),
      }),
    );
  });
  const db = testEnv.authenticatedContext("customer-a").firestore();
  const orderRef = doc(db, "orders/completed-order");
  await assertSucceeds(
    updateDoc(orderRef, {
      review: { rating: 4, comment: "Great meal.", createdAt: iso(5) },
    }),
  );
  await assertFails(
    updateDoc(orderRef, {
      review: { rating: 5, comment: "Changed rating.", createdAt: iso(6) },
    }),
  );
  await assertFails(
    updateDoc(doc(db, "orders/order-a"), {
      review: { rating: 5, comment: "Too early.", createdAt: iso(6) },
    }),
  );
});
