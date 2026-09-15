# Tita Mars Eatery & Bakery

Responsive React/Vite storefront and owner/staff interface, based on the supplied Tita Mars UI Kit, Food App Showcase, and System Flow Infographic.

## Run locally

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open http://127.0.0.1:4173/. Do not open `dist/index.html` directly: the app needs a local HTTP server.

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

## Implemented

- Orange/cream and charcoal themes, locally bundled Poppins/Inter fonts, food photography, responsive navigation.
- Home, supplier-filtered/searchable/sortable catalog, favorites, product details, persistent cart.
- Pickup or Taytay/Cainta delivery, cash/GCash selection, checkout, persistent confirmation, order tracking, completed-order reviews.
- Local customer registration, owner setup, role-specific login, profile editing, logout.
- Owner dashboard with real local-order metrics, charts, CSV export, product editor and image uploads, archive/restore, inventory/restock, orders, staff management, reports and settings.
- Staff order queue, order status updates, inventory monitoring and sales reports.

## Catalog and inventory

The seed catalog contains exactly the 22 approved products with unchanged names/prices and initial stock of 20 each. Ribbonette's Banana Loaf (₱170) and Gabbis Banana Loaf (₱160) have separate IDs. Existing saved product edits and stock quantities are preserved.

Only finished products are tracked. Stock is deducted once when an order becomes Completed; other active statuses do not deduct stock. Completed orders are locked. Archived, manually unavailable and out-of-stock products cannot be ordered.

Food photos are temporary illustrative assets. Replace them using Products → Edit → Upload Image (up to 1.5 MB for this local preview).

## Accounts and persistence: local preview only

Use Account → Owner Login → Set up first owner account, then add staff through Staff Management. Customers can register from the login page. “Explore preview” lets you inspect each workspace without creating an account.

**This is not production authentication or a connected database.** Accounts, settings, products, favorites, carts and orders are stored in this browser's localStorage. Local role checks and password hashing do not provide server-side access control. Preview workspaces intentionally bypass login. Do not enter real customer or payment data.

There is no Laravel/Firebase backend, cross-device synchronization, server transaction/locking, automated GCash verification, email recovery or notifications. GCash is a payment preference with manual store instructions, not an integrated payment gateway. Concurrent order completion across different browser tabs/devices requires a transactional backend before real use.

## Verification

See `design-qa.md` for screenshot comparisons, repaired issues and test evidence.

The reusable `scripts/browser-qa.mjs` launches an isolated agent-browser session and tests the approved catalog, themes, cart, checkout, inventory, accounts, reviews and responsive screens without touching your normal browser data.

```powershell
$env:AGENT_BROWSER_BIN = 'C:/path/to/agent-browser-win32-x64.exe'
node scripts/browser-qa.mjs
```

Test accounts use reserved `.example` addresses and exist only inside that temporary browser session, which closes when the run finishes.
