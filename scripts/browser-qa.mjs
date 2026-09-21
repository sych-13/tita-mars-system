import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const binary = process.env.AGENT_BROWSER_BIN;
if (!binary)
  throw new Error(
    "Set AGENT_BROWSER_BIN to the installed agent-browser executable.",
  );
const session = "tita-qa-" + Date.now();
const base = process.env.QA_URL || "http://127.0.0.1:4173/";
const call = (...args) => {
  const output = spawnSync(binary, ["--session", session, "--json", ...args], {
    encoding: "utf8",
    timeout: 40000,
  });
  if (output.status !== 0)
    throw new Error(args[0] + ": " + output.stderr + output.stdout);
  const response = JSON.parse(output.stdout);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const evaluate = (expression) => call("eval", expression).result;
const pause = () => call("wait", "350");
const go = (route) => {
  call("open", base + "#" + route);
  pause();
};
const click = (selector) => call("click", selector);
const fill = (selector, value) => call("fill", selector, String(value));
const select = (selector, value) => call("select", selector, value);
const clickText = (text, scope = "main") => {
  evaluate(
    "(() => { const el = [...document.querySelectorAll(" +
      JSON.stringify(scope + " button, " + scope + " a") +
      ")].find(el => el.textContent.trim() === " +
      JSON.stringify(text) +
      '); if (!el) throw new Error("Missing control: " + ' +
      JSON.stringify(text) +
      "); el.click(); return true; })()",
  );
  pause();
};
const products = () =>
  evaluate('JSON.parse(localStorage.getItem("tita-mars-products-v2"))');
const orders = () =>
  evaluate('JSON.parse(localStorage.getItem("tita-mars-orders-v2"))');
const shot = (name) => {
  pause();
  call("screenshot", "qa-" + name + ".png");
};
let checks = 0;
const pass = (label) => {
  checks++;
  console.log("PASS " + label);
};
try {
  go("catalog");
  call("set", "viewport", "1440", "1000");
  const catalog = products();
  assert.equal(catalog.length, 22);
  const expected = [
    ["Adobo", 70],
    ["Chicken", 70],
    ["Sinigang", 70],
    ["Hotdog", 12],
    ["Lumpia", 12],
    ["Longanisa", 12],
    ["Rice", 12],
    ["Egg", 12],
    ["Fried Rice", 15],
    ["Pansit", 15],
    ["Hopia Monggo", 70],
    ["Hopia Ube Regular", 70],
    ["Hopia de Leche", 90],
    ["Banana Loaf", 170],
    ["Egg Pie", 210],
    ["Hokkaido Cheese Rolls", 200],
    ["Cheese Roll", 110],
    ["Ube Ensaymada", 90],
    ["Ensaymada", 90],
    ["Regular Combi Pie", 80],
    ["Ube Cake", 160],
    ["Banana Loaf", 160],
  ];
  assert.deepEqual(
    catalog.map((p) => [p.name, p.price]),
    expected,
  );
  assert(
    catalog.every((p) => p.stock === 20 && p.image.startsWith(new URL("assets/", base).pathname)),
  );
  assert.equal(new Set(catalog.map((p) => p.id)).size, 22);
  pass(
    "All 22 approved products, exact prices, unique IDs, stock 20 and local images",
  );

  fill('[aria-label="Search the menu"]', "Banana");
  assert.equal(
    evaluate('document.querySelectorAll(".product-card").length'),
    2,
  );
  assert.deepEqual(
    evaluate(
      '[...document.querySelectorAll(".product-price-row strong")].map(el => el.textContent)',
    ),
    ["₱170", "₱160"],
  );
  click(".product-card:first-child .favorite-button");
  clickText("My favorites1", ".catalog-sidebar");
  assert.equal(
    evaluate('document.querySelectorAll(".product-card").length'),
    1,
  );
  pass("Supplier-separated Banana Loaf search and saved favorites");
  go("home");
  shot("home-light");
  click(".theme-toggle");
  pause();
  shot("home-dark");
  call("reload");
  pause();
  assert.equal(evaluate("document.documentElement.dataset.theme"), "dark");
  pass("Theme persists after refresh");
  call("set", "viewport", "390", "844");
  shot("home-mobile-dark");
  click(".theme-toggle");
  pause();
  shot("home-mobile-light");
  assert(evaluate("document.documentElement.scrollWidth <= innerWidth"));
  assert(
    evaluate(
      'document.querySelector(".brand-mark").getBoundingClientRect().left < 50',
    ),
  );
  pass("Mobile layout has no page overflow and logo stays left");
  call("set", "viewport", "1440", "1000");

  go("catalog");
  shot("catalog-light");
  click(".product-card:first-child .add-button");
  go("cart");
  click('[aria-label="Increase Adobo quantity"]');
  call("reload");
  pause();
  assert.equal(
    evaluate('document.querySelector(".quantity-control span").textContent'),
    "2",
  );
  shot("cart-desktop");
  pass("Cart quantity update survives refresh");
  go("checkout");
  fill('[name="name"]', "QA Customer");
  fill('[name="phone"]', "09123456789");
  click('[name="order-type"][value="delivery"]');
  fill('[name="address"]', "Test address, Barangay San Juan");
  select('[name="area"]', "Taytay");
  assert.equal(
    evaluate('document.querySelector(".checkout-total strong").textContent'),
    "₱160",
  );
  shot("checkout-light");
  click(".checkout-summary button");
  pause();
  assert(evaluate('document.querySelector(".order-confirmation") !== null'));
  assert.equal(orders()[0].status, "Pending");
  assert.equal(orders()[0].deliveryFee, 20);
  assert.equal(products().find((p) => p.id === "TME-001").stock, 20);
  const firstOrder = orders()[0];
  call("reload");
  pause();
  assert(evaluate('document.querySelector(".order-confirmation") !== null'));
  shot("confirmation");
  go("my-orders");
  assert(
    evaluate(
      "document.body.innerText.includes(" +
        JSON.stringify(firstOrder.number) +
        ")",
    ),
  );
  pass(
    "Delivery checkout, ₱20 fee, confirmation refresh and order history; no Pending stock deduction",
  );

  go("home");
  click(".popular-grid .product-card:first-child .add-button");
  go("checkout");
  fill('[name="name"]', "QA Customer");
  fill('[name="phone"]', "09123456789");
  click(".checkout-summary button");
  pause();
  assert.equal(orders().length, 2);
  assert(evaluate('document.querySelector(".order-confirmation") !== null'));
  assert.equal(orders()[0].deliveryFee, 0);
  pass(
    "Second order keeps its thank-you screen and is saved separately; pickup is free",
  );

  go("setup");
  fill('[name="name"]', "QA Owner");
  fill('[name="email"]', "owner@tita-qa.example");
  fill('[name="password"]', "QaOnly-2026!");
  fill('[name="confirm"]', "QaOnly-2026!");
  click('.auth-card form button[type="submit"], .auth-card form>.btn-brand');
  pause();
  assert.equal(evaluate("location.hash"), "#owner");
  pass("First owner setup and role navigation");

  for (const viewport of [["390", "844"], ["768", "1024"]]) {
    call("set", "viewport", ...viewport);
    for (const route of ["owner", "staff", "products", "manage-orders", "inventory", "reports", "staff-management", "settings", "staff-reports"]) {
      go(route);
      assert(evaluate("document.documentElement.scrollWidth <= innerWidth"), route + " overflow at " + viewport[0]);
    }
  }
  call("set", "viewport", "1440", "1000");
  pass("All 9 owner/staff screens stay inside tablet and mobile viewports");

  go("manage-orders?order=" + firstOrder.id);
  for (const status of ["Confirmed", "Preparing", "Out for Delivery"]) {
    select("dialog select", status);
    click("dialog>.full-button");
    pause();
    assert.equal(products().find((p) => p.id === "TME-001").stock, 20);
    go("manage-orders?order=" + firstOrder.id);
  }
  select("dialog select", "Completed");
  click("dialog>.full-button");
  pause();
  assert.equal(products().find((p) => p.id === "TME-001").stock, 18);
  go("manage-orders?order=" + firstOrder.id);
  assert(evaluate('document.querySelector("dialog select").disabled'));
  call("reload");
  pause();
  assert.equal(products().find((p) => p.id === "TME-001").stock, 18);
  pass(
    "Confirmed/Preparing/Out for Delivery leave stock unchanged; Completed deducts exactly once and locks",
  );

  go("owner");
  shot("owner-light");
  click(".theme-toggle");
  pause();
  shot("owner-dark");
  go("products");
  shot("products-dark");
  click('[aria-label="Edit Adobo from Tita Mars Eatery"]');
  fill('[name="stock"]', "0");
  clickText("Save Product", "dialog");
  go("catalog");
  assert(
    evaluate(
      'document.querySelector(".product-card:first-child .add-button").disabled',
    ),
  );
  pass("Out-of-stock products cannot be added");
  go("inventory");
  shot("inventory-dark");
  click('[aria-label="Restock Adobo from Tita Mars Eatery"]');
  fill('dialog input[type="number"]', "20");
  clickText("Add Stock", "dialog");
  assert.equal(products().find((p) => p.id === "TME-001").stock, 20);
  assert(products().find((p) => p.id === "TME-001").available);
  pass("Owner restock updates stock and restores sold-out availability");

  go("products");
  click('[aria-label="Archive Adobo from Tita Mars Eatery"]');
  go("catalog");
  assert.equal(
    evaluate('document.querySelectorAll(".product-card").length'),
    21,
  );
  go("products");
  clickText("Archived");
  clickText("Restore");
  assert(!products().find((p) => p.id === "TME-001").archived);
  clickText("Active");
  click('[aria-label="Edit Adobo from Tita Mars Eatery"]');
  call("uncheck", '[name="available"]');
  clickText("Save Product", "dialog");
  go("catalog");
  assert(
    evaluate(
      'document.querySelector(".product-card:first-child .add-button").disabled',
    ),
  );
  assert.equal(
    evaluate(
      'document.querySelector(".product-card:first-child .product-price-row small").textContent',
    ),
    "Unavailable",
  );
  go("products");
  click('[aria-label="Edit Adobo from Tita Mars Eatery"]');
  call("check", '[name="available"]');
  clickText("Save Product", "dialog");
  pass(
    "Archive/restore and manual availability controls affect customer display",
  );

  go("staff-management");
  clickText("Add Staff");
  fill('dialog input[type="text"]', "QA Staff");
  fill('dialog input[type="email"]', "staff@tita-qa.example");
  fill('dialog input[type="password"]', "QaOnly-2026!");
  clickText("Save staff member", "dialog");
  assert(evaluate('document.body.innerText.includes("staff@tita-qa.example")'));
  shot("staff-management-dark");
  pass("Owner can create a staff account");

  go("logout");
  clickText("Logout");
  pause();
  go("login?role=staff");
  fill('[name="email"]', "staff@tita-qa.example");
  fill('[name="password"]', "QaOnly-2026!");
  clickText("Login");
  pause();
  assert.equal(evaluate("location.hash"), "#staff");
  shot("staff-dark");
  go("products");
  assert(
    evaluate(
      'document.body.innerText.includes("This area needs a different role.")',
    ),
  );
  go("staff-reports");
  shot("staff-reports-dark");
  pass("Staff login, staff dashboard/report and UI role restriction");

  go("logout");
  clickText("Logout");
  go("my-orders");
  clickText("Rate & Review");
  click('[aria-label="Rate 4 stars"]');
  fill("dialog textarea", "Great test meal.");
  clickText("Submit Review", "dialog");
  assert.equal(orders().find((o) => o.id === firstOrder.id).review.rating, 4);
  shot("my-orders-dark");
  pass("Completed customer order accepts one review");

  go("register");
  shot("register-dark");
  fill('[name="name"]', "QA Registered Customer");
  fill('[name="email"]', "customer@tita-qa.example");
  fill('[name="phone"]', "09123456789");
  fill('[name="password"]', "QaOnly-2026!");
  fill('[name="confirm"]', "QaOnly-2026!");
  clickText("Register");
  pause();
  assert.equal(evaluate("location.hash"), "#home");
  go("profile");
  shot("profile-dark");
  assert(
    evaluate('document.body.innerText.includes("QA Registered Customer")'),
  );
  pass("Customer registration and profile");

  for (const viewport of [
    ["1440", "1000"],
    ["768", "1024"],
    ["390", "844"],
  ]) {
    call("set", "viewport", ...viewport);
    for (const route of [
      "home",
      "catalog",
      "cart",
      "checkout",
      "my-orders",
      "about",
      "login",
      "profile",
      "product?id=TME-001",
    ]) {
      go(route);
      assert(
        evaluate("document.body.innerText.trim().length > 80"),
        route + " must render",
      );
      assert(
        evaluate('!document.querySelector("vite-error-overlay")'),
        route + " must have no overlay",
      );
      assert(
        evaluate("document.documentElement.scrollWidth <= innerWidth"),
        route + " overflow at " + viewport[0],
      );
    }
  }
  pass(
    "9 customer routes render without overflow at desktop, tablet and mobile widths",
  );
  const errorData = call("errors");
  console.log("PAGE_ERRORS " + JSON.stringify(errorData));
  assert(!errorData.errors?.length, "Unexpected page errors");
  pass("No uncaught browser errors");
  console.log(
    "ALL " +
      checks +
      " CHECK GROUPS PASSED. Isolated browser session: " +
      session,
  );
} finally {
  call("close");
}
