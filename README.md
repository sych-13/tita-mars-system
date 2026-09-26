# Tita Mars Eatery & Bakery

Responsive React/Vite storefront and owner/staff workspace based on the supplied Tita Mars design references.

## Run locally

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open http://127.0.0.1:4173/. Do not open `dist/index.html` directly; the app needs an HTTP server.

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

## Implemented

- Customer storefront, supplier-filtered catalog, search, favorites, product details and persistent cart.
- Pickup or Taytay/Cainta delivery, Cash or GCash selection, checkout, confirmation, order tracking and completed-order reviews.
- Owner workspace: dashboard, product editor, archive/restore, inventory, reports, CSV export, staff management and settings.
- Staff workspace: order queue, status updates, inventory monitoring and daily sales report.
- Role-aware return-to-workspace navigation from the storefront and safe modals that do not dismiss on outside clicks.
- Light/dark themes, responsive layouts and temporary food images.

## Catalog and inventory

The seed catalog contains the exact 22 approved products with unchanged names, prices and suppliers. Both Banana Loaf products remain separate: Ribbonette's is PHP 170 and Gabbis is PHP 160. Initial stock is 20 per product.

Finished products only are tracked. Stock is deducted once when an order becomes Completed; pending, confirmed, preparing, ready-for-pickup and out-for-delivery orders do not deduct stock. Completed orders are locked. Archived, unavailable and out-of-stock products cannot be ordered.

## Firebase data mode

The app is prepared for Firebase Authentication and Cloud Firestore. When the six `VITE_FIREBASE_*` variables are configured, customer accounts, profiles, products, orders, reviews, order status and completed-order inventory deductions are stored in Firebase and update connected screens in real time.

The app retains a local preview fallback when Firebase variables are not available. Preview workspaces intentionally bypass login. Favorites and cart state remain browser-local for now.

### Configure GitHub Pages

Add these repository secrets in **GitHub -> Settings -> Secrets and variables -> Actions**, copying the values from your local `.env.local` file:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The GitHub Pages workflow uses these values only during the production build. A push to `main` builds and deploys automatically.

### First owner and staff roles

Customer registration is public. Owner and staff roles are deliberately not self-assignable. Create each privileged account in Firebase Authentication with Email/Password, then use the Firebase console to create the matching `profiles/{Firebase Auth UID}` document in Firestore:

```json
{
  "name": "Owner or staff name",
  "email": "account@example.com",
  "phone": "",
  "address": "",
  "role": "owner",
  "active": true,
  "createdAt": "2026-09-27T00:00:00.000Z",
  "updatedAt": "2026-09-27T00:00:00.000Z"
}
```

Use `"staff"` for staff profiles. This one-time privileged setup prevents a public customer from granting themselves admin access. A future server-side staff-invite function can replace the console-only role assignment.

## Verification

Run the production build before deployment:

```powershell
npm run build
```

The reusable `scripts/browser-qa.mjs` launches an isolated browser session and tests the catalog, themes, cart, checkout, inventory, accounts, reviews and responsive screens without touching the normal browser profile.
